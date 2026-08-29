function stores = create_idrid_datastore(repoRoot, inputSize, splitName)
%CREATE_IDRID_DATASTORE Create an IDRiD validation datastore.
%
% Usage:
%   stores = create_idrid_datastore();
%   stores = create_idrid_datastore([], [224 224 3], "testing");
%   stores = create_idrid_datastore([], [224 224 3], "all");

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(inputSize)
    inputSize = [224 224 3];
end

if nargin < 3 || isempty(splitName) || strlength(string(splitName)) == 0
    splitName = "testing";
end

repoRoot = char(repoRoot);
splitName = lower(string(splitName));
assert(any(splitName == ["training", "testing", "all"]), ...
    'splitName must be "training", "testing", or "all".');

indexPath = fullfile(repoRoot, 'data', 'indexes', 'idrid_disease_grading.csv');
if ~isfile(indexPath)
    fprintf('IDRiD index not found. Building it now...\n');
    build_idrid_index(repoRoot);
end

indexTable = readtable(indexPath, 'TextType', 'string');
if splitName ~= "all"
    indexTable = indexTable(indexTable.split == splitName, :);
end

assert(height(indexTable) > 0, 'No IDRiD rows found for split: %s', splitName);

classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
imds = imageDatastore(cellstr(indexTable.image_path));
imds.Labels = categorical(indexTable.label_name, classNames);
imds.ReadFcn = @(filename) retinascan.io.readAndPreprocessForNetwork(filename, inputSize);

augData = augmentedImageDatastore(inputSize(1:2), imds);

stores = struct( ...
    'indexTable', indexTable, ...
    'classNames', classNames, ...
    'inputSize', inputSize, ...
    'imds', imds, ...
    'augData', augData, ...
    'splitName', splitName ...
);

fprintf('IDRiD datastore ready.\n');
fprintf('Split: %s\n', splitName);
fprintf('Images: %d\n\n', numel(imds.Files));
fprintf('Class distribution:\n');
disp(countEachLabel(imds));
end
