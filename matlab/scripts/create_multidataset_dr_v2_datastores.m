function stores = create_multidataset_dr_v2_datastores(repoRoot, inputSize, enableDeviceAugmentation, prepareCache)
%CREATE_MULTIDATASET_DR_V2_DATASTORES Training-only augmentation and oversampling.
if nargin < 1 || isempty(repoRoot)
    repoRoot = fileparts(fileparts(fileparts(mfilename('fullpath'))));
end
if nargin < 2 || isempty(inputSize), inputSize = [224 224 3]; end
if nargin < 3, enableDeviceAugmentation = true; end
if nargin < 4, prepareCache = false; end
indexTable = build_multidataset_dr_v2_index(repoRoot);
classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
indexTable.read_path = indexTable.image_path;
if prepareCache
    cacheDir = fullfile(repoRoot, 'data', 'processed', 'dr_v2_clahe_unit_224_v1');
    assert(isequal(inputSize, [224 224 3]), 'Cache contract requires 224x224 RGB.');
    if ~isfolder(cacheDir), mkdir(cacheDir); end
    rows = find(ismember(indexTable.split, ["train", "validation", "calibration"]));
    for n = 1:numel(rows)
        k = rows(n);
        cachePath = fullfile(cacheDir, indexTable.image_sha256(k) + ".png");
        if ~isfile(cachePath)
            img = retinascan.io.readAndPreprocessForNetwork(indexTable.image_path(k), inputSize);
            imwrite(im2uint8(img), cachePath);
        end
        indexTable.read_path(k) = cachePath;
        if mod(n,100) == 0, fprintf('Preprocessing cache: %d/%d\n', n, numel(rows)); end
    end
end
stores = struct('indexTable', indexTable, 'classNames', classNames, ...
    'inputSize', inputSize, 'deviceAugmentationEnabled', enableDeviceAugmentation);
names = ["train", "validation", "calibration", "external_holdout", "external_test"];
fields = ["train", "val", "calibration", "external", "test"];
for k = 1:numel(names)
    rows = indexTable(indexTable.split == names(k), :);
    if names(k) == "train"
        rows = rows(repelem((1:height(rows))', rows.sample_weight), :);
        rows = rows(randperm(height(rows)), :);
    end
    imds = imageDatastore(cellstr(rows.read_path));
    imds.Labels = categorical(rows.label_name, classNames);
    isCached = prepareCache && k <= 3;
    isTraining = names(k) == "train" && enableDeviceAugmentation;
    imds.ReadFcn = @(file) localRead(file, inputSize, isCached, isTraining);
    aug = augmentedImageDatastore(inputSize(1:2), imds);
    if isTraining
        augmenter = imageDataAugmenter('RandRotation', [-12 12], ...
            'RandXReflection', true, 'RandScale', [0.95 1.05]);
        aug = augmentedImageDatastore(inputSize(1:2), imds, 'DataAugmentation', augmenter);
    end
    stores.(fields(k) + "Rows") = rows;
    stores.(fields(k) + "Imds") = imds;
    stores.("aug" + upper(extractBefore(fields(k), 2)) + extractAfter(fields(k), 1)) = aug;
    fprintf('%s: %d images\n', names(k), height(rows));
end
stores.validationRows = stores.valRows;
% Mild residual weighting after Grade 3/4 oversampling avoids double balancing.
counts = countcats(stores.trainImds.Labels);
weights = sqrt(median(counts) ./ max(counts, 1));
stores.classWeights = single(weights / mean(weights));
end

function imageOut = localRead(file, inputSize, cached, augment)
if cached
    imageOut = im2single(imread(file));
else
    imageOut = im2single(im2uint8(retinascan.io.readAndPreprocessForNetwork(file, inputSize)));
end
if ~augment, return; end
if rand < 0.20, imageOut = imgaussfilt(imageOut, 0.25 + rand * 0.45); end
if rand < 0.45
    imageOut = (imageOut - 0.5) * (0.9 + rand * 0.2) + 0.5 + (rand - 0.5) * 0.1;
end
if rand < 0.35, imageOut = imageOut .* reshape(0.9 + rand(1,3) * 0.2, 1, 1, 3); end
if rand < 0.25
    [x,y] = meshgrid(linspace(-1,1,size(imageOut,2)), linspace(-1,1,size(imageOut,1)));
    imageOut = imageOut .* (1 - (0.1 + rand * 0.15) * min(x.^2 + y.^2, 1));
end
imageOut = single(min(max(imageOut, 0), 1));
end
