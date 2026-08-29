function splitTable = create_aptos_fixed_split(repoRoot, validationRatio, seed, splitName)
%CREATE_APTOS_FIXED_SPLIT Create a deterministic stratified APTOS split.
%
% Usage:
%   splitTable = create_aptos_fixed_split()
%
% Output:
%   data/splits/aptos2019_split_v1.csv

if nargin < 1 || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(validationRatio)
    validationRatio = 0.20;
end

if nargin < 3 || isempty(seed)
    seed = 20260828;
end

if nargin < 4 || strlength(string(splitName)) == 0
    splitName = "aptos2019_split_v1";
end

repoRoot = char(repoRoot);
indexPath = fullfile(repoRoot, 'data', 'indexes', 'aptos2019_train.csv');
outputDir = fullfile(repoRoot, 'data', 'splits');
outputCsv = fullfile(outputDir, sprintf('%s.csv', char(splitName)));

if isfile(outputCsv)
    splitTable = readtable(outputCsv, 'TextType', 'string');
    fprintf('Using existing fixed split: %s\n', outputCsv);
    localPrintSplitSummary(splitTable);
    return;
end

if ~isfile(indexPath)
    fprintf('APTOS index not found. Building it now...\n');
    build_aptos_index(repoRoot);
end

indexTable = readtable(indexPath, 'TextType', 'string');
requiredColumns = ["image_path", "label", "label_name", "referable_dr", "source_dataset", "image_id"];
missingColumns = setdiff(requiredColumns, string(indexTable.Properties.VariableNames));
assert(isempty(missingColumns), 'Missing required column(s): %s', char(strjoin(missingColumns, ', ')));

rng(seed, 'twister');
split = strings(height(indexTable), 1);
split(:) = "train";

classLabels = sort(unique(indexTable.label));

for idx = 1:numel(classLabels)
    classLabel = classLabels(idx);
    classRows = find(indexTable.label == classLabel);
    classRows = classRows(randperm(numel(classRows)));
    validationCount = max(1, round(validationRatio * numel(classRows)));
    split(classRows(1:validationCount)) = "validation";
end

splitVersion = repmat(string(splitName), height(indexTable), 1);
splitSeed = repmat(seed, height(indexTable), 1);

splitTable = [indexTable, table(split, splitVersion, splitSeed, ...
    'VariableNames', {'split', 'split_version', 'split_seed'})];

if ~isfolder(outputDir)
    mkdir(outputDir);
end

writetable(splitTable, outputCsv);
fprintf('Wrote fixed APTOS split: %s\n', outputCsv);
localPrintSplitSummary(splitTable);
end

function localPrintSplitSummary(splitTable)
fprintf('\nFixed split summary:\n');
fprintf('  Train: %d images\n', sum(splitTable.split == "train"));
fprintf('  Validation: %d images\n\n', sum(splitTable.split == "validation"));

classNames = unique(splitTable.label_name, 'stable');
for idx = 1:numel(classNames)
    name = classNames(idx);
    trainCount = sum(splitTable.label_name == name & splitTable.split == "train");
    valCount = sum(splitTable.label_name == name & splitTable.split == "validation");
    fprintf('  %-18s train=%4d validation=%4d\n', char(name), trainCount, valCount);
end
fprintf('\n');
end
