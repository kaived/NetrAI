function indexTable = build_idrid_index(repoRoot)
%BUILD_IDRID_INDEX Build an IDRiD disease-grading image-label index.
%
% This does not train a model. It prepares IDRiD for external validation of
% the current APTOS-trained DR classifier.
%
% Usage:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   indexTable = build_idrid_index();
%
% Output:
%   <repo-root>/data/indexes/idrid_disease_grading.csv

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
idridRoot = fullfile(repoRoot, 'data', 'raw', 'idrid', 'disease_grading');
imagesRoot = fullfile(idridRoot, '1. Original Images');
labelsRoot = fullfile(idridRoot, '2. Groundtruths');

trainImagesDir = fullfile(imagesRoot, 'a. Training Set');
testImagesDir = fullfile(imagesRoot, 'b. Testing Set');
trainLabelsCsv = fullfile(labelsRoot, 'a. IDRiD_Disease Grading_Training Labels.csv');
testLabelsCsv = fullfile(labelsRoot, 'b. IDRiD_Disease Grading_Testing Labels.csv');

assert(isfolder(idridRoot), 'IDRiD disease_grading folder not found: %s', idridRoot);
assert(isfolder(trainImagesDir), 'IDRiD training image folder not found: %s', trainImagesDir);
assert(isfolder(testImagesDir), 'IDRiD testing image folder not found: %s', testImagesDir);
assert(isfile(trainLabelsCsv), 'IDRiD training labels CSV not found: %s', trainLabelsCsv);
assert(isfile(testLabelsCsv), 'IDRiD testing labels CSV not found: %s', testLabelsCsv);

trainTable = localReadLabels(trainLabelsCsv, trainImagesDir, "training");
testTable = localReadLabels(testLabelsCsv, testImagesDir, "testing");
indexTable = [trainTable; testTable];

outputDir = fullfile(repoRoot, 'data', 'indexes');
if ~isfolder(outputDir)
    mkdir(outputDir);
end

outputCsv = fullfile(outputDir, 'idrid_disease_grading.csv');
writetable(indexTable, outputCsv);

fprintf('Wrote IDRiD index: %s\n', outputCsv);
fprintf('Total images: %d\n', height(indexTable));
fprintf('Training images: %d\n', sum(indexTable.split == "training"));
fprintf('Testing images: %d\n\n', sum(indexTable.split == "testing"));

localPrintDistribution(indexTable, "all");
localPrintDistribution(indexTable(indexTable.split == "training", :), "training");
localPrintDistribution(indexTable(indexTable.split == "testing", :), "testing");
end

function labelTable = localReadLabels(labelsCsv, imagesDir, splitName)
opts = detectImportOptions(labelsCsv, 'TextType', 'string', 'VariableNamingRule', 'preserve');
labels = readtable(labelsCsv, opts);

imageColumn = localFindColumn(labels, ["imagename", "imageid", "image"]);
gradeColumn = localFindColumn(labels, ["retinopathygrade", "diagnosis", "grade"]);
dmeColumn = localFindOptionalColumn(labels, ["riskofmacularedema", "macularedema", "edema"]);

imageId = string(labels.(char(imageColumn)));
imageId = strip(imageId);
imageId = regexprep(imageId, '\.[^.]+$', '');

label = localToDouble(labels.(char(gradeColumn)));
assert(all(~isnan(label) & label >= 0 & label <= 4), ...
    'IDRiD labels must be numeric DR grades 0-4. Check: %s', labelsCsv);

dmeGrade = NaN(height(labels), 1);
if strlength(dmeColumn) > 0
    dmeGrade = localToDouble(labels.(char(dmeColumn)));
end

imagePath = strings(height(labels), 1);
imageExists = false(height(labels), 1);
for row = 1:height(labels)
    imagePath(row) = localFindImagePath(imagesDir, imageId(row));
    imageExists(row) = strlength(imagePath(row)) > 0;
end

if any(~imageExists)
    missing = table(imageId(~imageExists), repmat(string(imagesDir), sum(~imageExists), 1), ...
        'VariableNames', {'image_id', 'searched_folder'});
    error('Missing %d IDRiD image file(s). First missing image_id: %s', ...
        height(missing), char(missing.image_id(1)));
end

classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
labelName = strings(height(labels), 1);
for classId = 0:4
    labelName(label == classId) = classNames(classId + 1);
end

referableDR = label >= 2;
sourceDataset = repmat("idrid", height(labels), 1);
split = repmat(splitName, height(labels), 1);

labelTable = table( ...
    imagePath(:), ...
    label(:), ...
    labelName(:), ...
    referableDR(:), ...
    dmeGrade(:), ...
    split(:), ...
    sourceDataset(:), ...
    imageId(:), ...
    'VariableNames', {'image_path', 'label', 'label_name', 'referable_dr', 'dme_grade', 'split', 'source_dataset', 'image_id'} ...
);
end

function columnName = localFindColumn(tableIn, patterns)
columnName = localFindOptionalColumn(tableIn, patterns);
assert(strlength(columnName) > 0, 'Could not find column matching: %s', char(strjoin(patterns, ', ')));
end

function columnName = localFindOptionalColumn(tableIn, patterns)
names = string(tableIn.Properties.VariableNames);
normalized = lower(regexprep(names, '[^a-zA-Z0-9]', ''));

columnName = "";
for pattern = patterns
    matchIdx = find(contains(normalized, lower(pattern)), 1);
    if ~isempty(matchIdx)
        columnName = names(matchIdx);
        return;
    end
end
end

function values = localToDouble(rawValues)
if isnumeric(rawValues)
    values = double(rawValues);
    return;
end

values = str2double(string(rawValues));
end

function imagePath = localFindImagePath(imagesDir, imageId)
extensions = [".jpg", ".jpeg", ".png", ".tif", ".tiff"];
imagePath = "";

for ext = extensions
    candidate = string(fullfile(imagesDir, imageId + ext));
    if isfile(candidate)
        imagePath = candidate;
        return;
    end
end
end

function localPrintDistribution(indexTable, splitName)
if isempty(indexTable)
    return;
end

classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
fprintf('IDRiD class distribution (%s):\n', splitName);
for classId = 0:4
    classCount = sum(indexTable.label == classId);
    classPercent = 100 * classCount / height(indexTable);
    fprintf('  Class %d (%s): %d images (%.2f%%)\n', ...
        classId, classNames(classId + 1), classCount, classPercent);
end

referableCount = sum(indexTable.referable_dr);
fprintf('  Referable DR: %d images (%.2f%%)\n\n', ...
    referableCount, 100 * referableCount / height(indexTable));
end
