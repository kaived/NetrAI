function indexTable = build_multidataset_dr_v2_index(repoRoot)
%BUILD_MULTIDATASET_DR_V2_INDEX Build the Grade 3/4 improvement index.
%
% Training rows:
%   APTOS fixed train split + IDRiD disease-grading training split
%
% Validation rows:
%   APTOS fixed validation split
%
% External holdout rows:
%   IDRiD disease-grading testing split

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
splitPath = fullfile(repoRoot, 'data', 'splits', 'aptos2019_split_v1.csv');
idridIndexPath = fullfile(repoRoot, 'data', 'indexes', 'idrid_disease_grading.csv');

if ~isfile(splitPath)
    create_aptos_fixed_split(repoRoot, 0.20, 20260828, 'aptos2019_split_v1');
end

if ~isfile(idridIndexPath)
    build_idrid_index(repoRoot);
end

aptos = readtable(splitPath, 'TextType', 'string');
idrid = readtable(idridIndexPath, 'TextType', 'string');

aptosTrain = aptos(aptos.split == "train", :);
aptosValidation = aptos(aptos.split == "validation", :);
idridTrain = idrid(idrid.split == "training", :);
idridTesting = idrid(idrid.split == "testing", :);

trainRows = [
    localNormalizeColumns(aptosTrain, "train");
    localNormalizeColumns(idridTrain, "train")
];
validationRows = localNormalizeColumns(aptosValidation, "validation");
externalRows = localNormalizeColumns(idridTesting, "external_holdout");

indexTable = [trainRows; validationRows; externalRows];
indexTable.sample_weight = localSampleWeights(indexTable);
indexTable.grade34_focus = indexTable.label >= 3;

outputDir = fullfile(repoRoot, 'data', 'indexes');
if ~isfolder(outputDir)
    mkdir(outputDir);
end

outputCsv = fullfile(outputDir, 'multidataset_dr_v2.csv');
writetable(indexTable, outputCsv);

fprintf('Wrote multidataset DR v2 index: %s\n', outputCsv);
localPrintDistribution(indexTable, "all");
localPrintDistribution(indexTable(indexTable.split == "train", :), "train");
localPrintDistribution(indexTable(indexTable.split == "validation", :), "validation");
localPrintDistribution(indexTable(indexTable.split == "external_holdout", :), "external_holdout");
end

function normalized = localNormalizeColumns(inputTable, splitName)
required = ["image_path", "label", "label_name", "referable_dr", "source_dataset", "image_id"];
missing = setdiff(required, string(inputTable.Properties.VariableNames));
assert(isempty(missing), 'Missing column(s): %s', char(strjoin(missing, ', ')));

normalized = table( ...
    string(inputTable.image_path), ...
    double(inputTable.label), ...
    string(inputTable.label_name), ...
    logical(inputTable.referable_dr), ...
    repmat(splitName, height(inputTable), 1), ...
    string(inputTable.source_dataset), ...
    string(inputTable.image_id), ...
    'VariableNames', {'image_path', 'label', 'label_name', 'referable_dr', 'split', 'source_dataset', 'image_id'} ...
);
end

function sampleWeight = localSampleWeights(indexTable)
sampleWeight = ones(height(indexTable), 1);
sampleWeight(indexTable.source_dataset == "idrid" & indexTable.split == "train") = 1.35;
sampleWeight(indexTable.label == 3 & indexTable.split == "train") = sampleWeight(indexTable.label == 3 & indexTable.split == "train") * 2.00;
sampleWeight(indexTable.label == 4 & indexTable.split == "train") = sampleWeight(indexTable.label == 4 & indexTable.split == "train") * 2.50;
end

function localPrintDistribution(indexTable, splitName)
if isempty(indexTable)
    return;
end

fprintf('\nMultidataset DR v2 distribution (%s):\n', splitName);
for grade = 0:4
    count = sum(indexTable.label == grade);
    fprintf('  Grade %d: %d\n', grade, count);
end

fprintf('  APTOS rows: %d\n', sum(indexTable.source_dataset == "aptos2019"));
fprintf('  IDRiD rows: %d\n', sum(indexTable.source_dataset == "idrid"));
fprintf('  Grade 3/4 rows: %d\n', sum(indexTable.label >= 3));
end
