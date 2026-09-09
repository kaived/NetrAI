function stores = create_idrid_lesion_datastores(repoRoot, inputSize, splitName)
%CREATE_IDRID_LESION_DATASTORES Create IDRiD lesion localization helpers.
%
% The returned readPair(rowIndex) helper loads the retinal image and all
% available binary lesion masks for the same row.

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(inputSize)
    inputSize = [512 512 3];
end

if nargin < 3 || isempty(splitName)
    splitName = "training";
end

repoRoot = char(repoRoot);
splitName = lower(string(splitName));
assert(any(splitName == ["training", "testing", "all"]), ...
    'splitName must be "training", "testing", or "all".');

indexPath = fullfile(repoRoot, 'data', 'indexes', 'idrid_lesion_segmentation.csv');
if ~isfile(indexPath)
    build_idrid_lesion_index(repoRoot);
end

indexTable = readtable(indexPath, 'TextType', 'string');
if splitName ~= "all"
    indexTable = indexTable(indexTable.split == splitName, :);
end

assert(height(indexTable) > 0, 'No IDRiD lesion rows found for split: %s', splitName);

imds = imageDatastore(cellstr(indexTable.image_path));
imds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

stores = struct( ...
    'indexTable', indexTable, ...
    'inputSize', inputSize, ...
    'splitName', splitName, ...
    'imageDatastore', imds, ...
    'lesionColumns', ["microaneurysm_mask_path", "hemorrhage_mask_path", "hard_exudate_mask_path", "soft_exudate_mask_path", "optic_disc_mask_path"], ...
    'readPair', @(rowIndex) localReadPair(indexTable, rowIndex, inputSize) ...
);

fprintf('IDRiD lesion datastore helpers ready.\n');
fprintf('Split: %s\n', splitName);
fprintf('Images: %d\n', height(indexTable));
end

function pair = localReadPair(indexTable, rowIndex, inputSize)
assert(rowIndex >= 1 && rowIndex <= height(indexTable), 'rowIndex is outside the IDRiD lesion table.');

row = indexTable(rowIndex, :);
image = retinascan.io.readAndPreprocessForNetwork(row.image_path, inputSize);
maskSize = inputSize(1:2);

masks = struct( ...
    'microaneurysm', localReadBinaryMask(row.microaneurysm_mask_path, maskSize), ...
    'hemorrhage', localReadBinaryMask(row.hemorrhage_mask_path, maskSize), ...
    'hard_exudate', localReadBinaryMask(row.hard_exudate_mask_path, maskSize), ...
    'soft_exudate', localReadBinaryMask(row.soft_exudate_mask_path, maskSize), ...
    'optic_disc', localReadBinaryMask(row.optic_disc_mask_path, maskSize) ...
);

pair = struct( ...
    'image', image, ...
    'masks', masks, ...
    'image_id', row.image_id, ...
    'split', row.split ...
);
end

function mask = localReadBinaryMask(maskPath, maskSize)
if isempty(maskPath) || strlength(string(maskPath)) == 0 || ~isfile(maskPath)
    mask = false(maskSize);
    return;
end

raw = imread(maskPath);
if ndims(raw) == 3
    raw = rgb2gray(raw);
end

mask = imresize(raw > 0, maskSize, 'nearest');
end
