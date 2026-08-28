function stores = create_aptos_datastores(repoRoot, inputSize, validationRatio)
%CREATE_APTOS_DATASTORES Create train/validation datastores from APTOS index.
%
% Usage:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   stores = create_aptos_datastores();

if nargin < 1 || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(inputSize)
    inputSize = [224 224 3];
end

if nargin < 3 || isempty(validationRatio)
    validationRatio = 0.20;
end

repoRoot = char(repoRoot);
indexPath = fullfile(repoRoot, 'data', 'indexes', 'aptos2019_train.csv');

if ~isfile(indexPath)
    fprintf('APTOS index not found. Building it now...\n');
    build_aptos_index(repoRoot);
end

indexTable = readtable(indexPath, 'TextType', 'string');
classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];

files = cellstr(indexTable.image_path);
labels = categorical(indexTable.label_name, classNames);

imds = imageDatastore(files);
imds.Labels = labels;
imds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

[trainImds, valImds] = splitEachLabel(imds, 1 - validationRatio, 'randomized');

imageAugmenter = imageDataAugmenter( ...
    'RandRotation', [-8 8], ...
    'RandXReflection', true, ...
    'RandXTranslation', [-8 8], ...
    'RandYTranslation', [-8 8]);

augTrain = augmentedImageDatastore(inputSize(1:2), trainImds, ...
    'DataAugmentation', imageAugmenter);
augVal = augmentedImageDatastore(inputSize(1:2), valImds);

labelCounts = countcats(trainImds.Labels);
classWeights = median(labelCounts) ./ max(labelCounts, 1);
classWeights = classWeights / mean(classWeights);

stores = struct( ...
    'indexTable', indexTable, ...
    'classNames', classNames, ...
    'inputSize', inputSize, ...
    'allImds', imds, ...
    'trainImds', trainImds, ...
    'valImds', valImds, ...
    'augTrain', augTrain, ...
    'augVal', augVal, ...
    'classWeights', classWeights ...
);

fprintf('APTOS datastores ready.\n');
fprintf('Training images: %d\n', numel(trainImds.Files));
fprintf('Validation images: %d\n\n', numel(valImds.Files));

fprintf('Training class distribution:\n');
disp(countEachLabel(trainImds));

fprintf('Validation class distribution:\n');
disp(countEachLabel(valImds));
end
