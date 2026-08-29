function stores = create_aptos_datastores(repoRoot, inputSize, validationRatio, splitPath, balanceTraining)
%CREATE_APTOS_DATASTORES Create train/validation datastores from APTOS index.
%
% Usage:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   stores = create_aptos_datastores();

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(inputSize)
    inputSize = [224 224 3];
end

if nargin < 3 || isempty(validationRatio)
    validationRatio = 0.20;
end

if nargin < 4
    splitPath = "";
end

if nargin < 5 || isempty(balanceTraining)
    balanceTraining = false;
end

repoRoot = char(repoRoot);
indexPath = fullfile(repoRoot, 'data', 'indexes', 'aptos2019_train.csv');

if ~isfile(indexPath)
    fprintf('APTOS index not found. Building it now...\n');
    build_aptos_index(repoRoot);
end

indexTable = readtable(indexPath, 'TextType', 'string');
classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];

splitTable = [];
if ~isempty(splitPath) && strlength(string(splitPath)) > 0
    splitPath = char(string(splitPath));
    if ~isfile(splitPath)
        splitPath = fullfile(repoRoot, splitPath);
    end
    assert(isfile(splitPath), 'Split file not found: %s', splitPath);
    splitTable = readtable(splitPath, 'TextType', 'string');
end

files = cellstr(indexTable.image_path);
labels = categorical(indexTable.label_name, classNames);

imds = imageDatastore(files);
imds.Labels = labels;
imds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

if isempty(splitTable)
    [trainImds, valImds] = splitEachLabel(imds, 1 - validationRatio, 'randomized');
    splitSource = "randomized_split";
else
    [trainImds, valImds] = localDatastoresFromSplit(splitTable, classNames, inputSize);
    splitSource = string(splitPath);
end

originalTrainImds = trainImds;
if balanceTraining
    trainImds = localBalanceTrainingDatastore(trainImds, classNames);
end

imageAugmenter = imageDataAugmenter( ...
    'RandRotation', [-12 12], ...
    'RandXReflection', true, ...
    'RandXTranslation', [-12 12], ...
    'RandYTranslation', [-12 12], ...
    'RandScale', [0.92 1.08]);

augTrain = augmentedImageDatastore(inputSize(1:2), trainImds, ...
    'DataAugmentation', imageAugmenter);
augVal = augmentedImageDatastore(inputSize(1:2), valImds);

labelCounts = countcats(originalTrainImds.Labels);
classWeights = median(labelCounts) ./ max(labelCounts, 1);
classWeights = classWeights / mean(classWeights);

stores = struct( ...
    'indexTable', indexTable, ...
    'classNames', classNames, ...
    'inputSize', inputSize, ...
    'allImds', imds, ...
    'trainImds', trainImds, ...
    'originalTrainImds', originalTrainImds, ...
    'valImds', valImds, ...
    'augTrain', augTrain, ...
    'augVal', augVal, ...
    'splitSource', splitSource, ...
    'balanceTraining', balanceTraining, ...
    'classWeights', classWeights ...
);

fprintf('APTOS datastores ready.\n');
fprintf('Split source: %s\n', splitSource);
fprintf('Balanced training: %d\n', balanceTraining);
fprintf('Training images: %d\n', numel(trainImds.Files));
fprintf('Validation images: %d\n\n', numel(valImds.Files));

fprintf('Training class distribution:\n');
disp(countEachLabel(trainImds));

fprintf('Validation class distribution:\n');
disp(countEachLabel(valImds));
end

function [trainImds, valImds] = localDatastoresFromSplit(splitTable, classNames, inputSize)
requiredColumns = ["image_path", "label_name", "split"];
missingColumns = setdiff(requiredColumns, string(splitTable.Properties.VariableNames));
assert(isempty(missingColumns), 'Missing required split column(s): %s', char(strjoin(missingColumns, ', ')));

trainRows = splitTable.split == "train";
valRows = splitTable.split == "validation";
assert(any(trainRows), 'Split file has no train rows.');
assert(any(valRows), 'Split file has no validation rows.');

trainImds = imageDatastore(cellstr(splitTable.image_path(trainRows)));
trainImds.Labels = categorical(splitTable.label_name(trainRows), classNames);
trainImds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

valImds = imageDatastore(cellstr(splitTable.image_path(valRows)));
valImds.Labels = categorical(splitTable.label_name(valRows), classNames);
valImds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);
end

function balancedImds = localBalanceTrainingDatastore(trainImds, classNames)
labels = trainImds.Labels;
labelCounts = countcats(labels);
targetCount = min(max(labelCounts), ceil(3 * median(labelCounts)));

balancedFiles = strings(0, 1);
balancedLabels = strings(0, 1);

for idx = 1:numel(classNames)
    className = classNames(idx);
    classFiles = string(trainImds.Files(string(labels) == className));

    if isempty(classFiles)
        continue;
    end

    extraCount = max(0, targetCount - numel(classFiles));
    if extraCount > 0
        sampledFiles = classFiles(randi(numel(classFiles), extraCount, 1));
        classFiles = [classFiles; sampledFiles]; %#ok<AGROW>
    end

    balancedFiles = [balancedFiles; classFiles]; %#ok<AGROW>
    balancedLabels = [balancedLabels; repmat(className, numel(classFiles), 1)]; %#ok<AGROW>
end

order = randperm(numel(balancedFiles));
balancedFiles = balancedFiles(order);
balancedLabels = balancedLabels(order);

balancedImds = imageDatastore(cellstr(balancedFiles));
balancedImds.Labels = categorical(balancedLabels, classNames);
balancedImds.ReadFcn = trainImds.ReadFcn;
end
