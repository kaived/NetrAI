function stores = create_multidataset_dr_v2_datastores(repoRoot, inputSize, enableDeviceAugmentation)
%CREATE_MULTIDATASET_DR_V2_DATASTORES Datastores for Grade 3/4 improvement.
%
% This uses sample_weight from build_multidataset_dr_v2_index by repeating
% high-priority rows in the training datastore. Validation and external
% holdout rows are not oversampled.

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(inputSize)
    inputSize = [224 224 3];
end

if nargin < 3 || isempty(enableDeviceAugmentation)
    enableDeviceAugmentation = true;
end

repoRoot = char(repoRoot);
indexPath = fullfile(repoRoot, 'data', 'indexes', 'multidataset_dr_v2.csv');
if ~isfile(indexPath)
    build_multidataset_dr_v2_index(repoRoot);
end

indexTable = readtable(indexPath, 'TextType', 'string');
classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];

trainRows = localOversampleRows(indexTable(indexTable.split == "train", :));
validationRows = indexTable(indexTable.split == "validation", :);
externalRows = indexTable(indexTable.split == "external_holdout", :);

trainImds = imageDatastore(cellstr(trainRows.image_path));
trainImds.Labels = categorical(trainRows.label_name, classNames);
trainImds.ReadFcn = @(filename) localReadTrainingImage(filename, inputSize, enableDeviceAugmentation);

valImds = imageDatastore(cellstr(validationRows.image_path));
valImds.Labels = categorical(validationRows.label_name, classNames);
valImds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

externalImds = imageDatastore(cellstr(externalRows.image_path));
externalImds.Labels = categorical(externalRows.label_name, classNames);
externalImds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

imageAugmenter = imageDataAugmenter( ...
    'RandRotation', [-14 14], ...
    'RandXReflection', true, ...
    'RandXTranslation', [-14 14], ...
    'RandYTranslation', [-14 14], ...
    'RandScale', [0.90 1.10]);

augTrain = augmentedImageDatastore(inputSize(1:2), trainImds, 'DataAugmentation', imageAugmenter);
augVal = augmentedImageDatastore(inputSize(1:2), valImds);
augExternal = augmentedImageDatastore(inputSize(1:2), externalImds);

labelCounts = countcats(categorical(indexTable.label_name(indexTable.split == "train"), classNames));
classWeights = median(labelCounts) ./ max(labelCounts, 1);
classWeights = classWeights / mean(classWeights);

stores = struct( ...
    'indexTable', indexTable, ...
    'classNames', classNames, ...
    'inputSize', inputSize, ...
    'trainRows', trainRows, ...
    'validationRows', validationRows, ...
    'externalRows', externalRows, ...
    'trainImds', trainImds, ...
    'valImds', valImds, ...
    'externalImds', externalImds, ...
    'augTrain', augTrain, ...
    'augVal', augVal, ...
    'augExternal', augExternal, ...
    'classWeights', classWeights, ...
    'deviceAugmentationEnabled', enableDeviceAugmentation ...
);

fprintf('Multidataset DR v2 datastores ready.\n');
fprintf('Training rows after oversampling: %d\n', numel(trainImds.Files));
fprintf('Validation rows: %d\n', numel(valImds.Files));
fprintf('External holdout rows: %d\n', numel(externalImds.Files));
end

function rows = localOversampleRows(rows)
copies = max(1, round(rows.sample_weight));
expanded = rows([], :);
for idx = 1:height(rows)
    expanded = [expanded; repmat(rows(idx, :), copies(idx), 1)]; %#ok<AGROW>
end
rows = expanded(randperm(height(expanded)), :);
end

function imageOut = localReadTrainingImage(filename, inputSize, enableDeviceAugmentation)
imageOut = retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

if ~enableDeviceAugmentation
    return;
end

imageOut = localApplyDeviceStyleAugmentation(imageOut);
end

function imageOut = localApplyDeviceStyleAugmentation(imageIn)
imageOut = im2single(imageIn);

if rand < 0.35
    sigma = 0.35 + rand * 0.90;
    imageOut = imgaussfilt(imageOut, sigma);
end

if rand < 0.45
    brightnessShift = -0.08 + rand * 0.16;
    contrastScale = 0.85 + rand * 0.35;
    imageOut = (imageOut - 0.5) * contrastScale + 0.5 + brightnessShift;
end

if rand < 0.40
    colorScale = reshape(0.85 + rand(1, 3) * 0.30, 1, 1, 3);
    imageOut = imageOut .* colorScale;
end

if rand < 0.30
    imageOut = localApplyVignette(imageOut);
end

imageOut = min(max(imageOut, 0), 1);
end

function imageOut = localApplyVignette(imageIn)
[height, width, ~] = size(imageIn);
[xGrid, yGrid] = meshgrid(linspace(-1, 1, width), linspace(-1, 1, height));
radius = sqrt(xGrid.^2 + yGrid.^2);
strength = 0.10 + rand * 0.22;
mask = 1 - strength * min(radius.^2, 1);
imageOut = imageIn .* mask;
end
