function indexTable = build_aptos_index(repoRoot)
%BUILD_APTOS_INDEX Build the APTOS 2019 image-label index.
%
% Usage from MATLAB:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   indexTable = build_aptos_index()
%
% Output:
%   <repo-root>/data/indexes/aptos2019_train.csv

if nargin < 1 || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
aptosRoot = fullfile(repoRoot, 'data', 'raw', 'aptos2019');
trainCsv = fullfile(aptosRoot, 'train.csv');
trainImagesDir = fullfile(aptosRoot, 'train_images');
outputDir = fullfile(repoRoot, 'data', 'indexes');
outputCsv = fullfile(outputDir, 'aptos2019_train.csv');

assert(isfile(trainCsv), 'APTOS train.csv not found: %s', trainCsv);
assert(isfolder(trainImagesDir), 'APTOS train_images folder not found: %s', trainImagesDir);

opts = detectImportOptions(trainCsv, 'TextType', 'string');
labels = readtable(trainCsv, opts);

requiredColumns = ["id_code", "diagnosis"];
missingColumns = setdiff(requiredColumns, string(labels.Properties.VariableNames));
assert(isempty(missingColumns), 'Missing required column(s): %s', char(strjoin(missingColumns, ', ')));

imageId = string(labels.id_code);
label = double(labels.diagnosis);
imagePath = fullfile(trainImagesDir, imageId + ".png");
imageExists = isfile(imagePath);

if any(~imageExists)
    missing = table(imageId(~imageExists), imagePath(~imageExists), ...
        'VariableNames', {'image_id', 'expected_image_path'});
    missingCsv = fullfile(outputDir, 'aptos2019_missing_images.csv');
    if ~isfolder(outputDir)
        mkdir(outputDir);
    end
    writetable(missing, missingCsv);
    error('Missing %d APTOS image file(s). See: %s', height(missing), missingCsv);
end

labelName = strings(height(labels), 1);
classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
labelName(label == 0) = classNames(1);
labelName(label == 1) = classNames(2);
labelName(label == 2) = classNames(3);
labelName(label == 3) = classNames(4);
labelName(label == 4) = classNames(5);

referableDR = label >= 2;
sourceDataset = repmat("aptos2019", height(labels), 1);

indexTable = table( ...
    imagePath(:), ...
    label(:), ...
    labelName(:), ...
    referableDR(:), ...
    sourceDataset(:), ...
    imageId(:), ...
    'VariableNames', {'image_path', 'label', 'label_name', 'referable_dr', 'source_dataset', 'image_id'} ...
);

if ~isfolder(outputDir)
    mkdir(outputDir);
end

writetable(indexTable, outputCsv);

fprintf('Wrote APTOS index: %s\n', outputCsv);
fprintf('Total images: %d\n\n', height(indexTable));

fprintf('Class distribution:\n');
for classId = 0:4
    classCount = sum(indexTable.label == classId);
    classPercent = 100 * classCount / height(indexTable);
    fprintf('  Class %d (%s): %d images (%.2f%%)\n', ...
        classId, classNames(classId + 1), classCount, classPercent);
end

referableCount = sum(indexTable.referable_dr);
fprintf('\nReferable DR: %d images (%.2f%%)\n', ...
    referableCount, 100 * referableCount / height(indexTable));
fprintf('Non-referable DR: %d images (%.2f%%)\n', ...
    height(indexTable) - referableCount, ...
    100 * (height(indexTable) - referableCount) / height(indexTable));
end
