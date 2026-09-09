function indexTable = build_idrid_lesion_index(repoRoot)
%BUILD_IDRID_LESION_INDEX Build an IDRiD image-to-lesion-mask index.
%
% Output:
%   <repo-root>/data/indexes/idrid_lesion_segmentation.csv

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
segRoot = fullfile(repoRoot, 'data', 'raw', 'idrid', 'segmentation');
imagesRoot = fullfile(segRoot, '1. Original Images');
masksRoot = fullfile(segRoot, '2. All Segmentation Groundtruths');

assert(isfolder(segRoot), 'IDRiD segmentation folder not found: %s', segRoot);
assert(isfolder(imagesRoot), 'IDRiD segmentation image folder not found: %s', imagesRoot);
assert(isfolder(masksRoot), 'IDRiD segmentation mask folder not found: %s', masksRoot);

splits = {
    "training", "a. Training Set";
    "testing", "b. Testing Set"
};

lesions = localLesionDefinitions();
rows = table();

for splitIdx = 1:size(splits, 1)
    splitName = splits{splitIdx, 1};
    splitFolder = splits{splitIdx, 2};
    imageDir = fullfile(imagesRoot, char(splitFolder));
    assert(isfolder(imageDir), 'IDRiD segmentation image split folder not found: %s', imageDir);

    imageFiles = localListImages(imageDir);
    splitRows = table();

    for fileIdx = 1:numel(imageFiles)
        imagePath = string(fullfile(imageFiles(fileIdx).folder, imageFiles(fileIdx).name));
        [~, imageId, ~] = fileparts(imagePath);

        row = table(imagePath, string(imageId), splitName, ...
            'VariableNames', {'image_path', 'image_id', 'split'});

        for lesionIdx = 1:numel(lesions)
            lesion = lesions(lesionIdx);
            maskDir = fullfile(masksRoot, char(splitFolder), lesion.folder);
            maskPath = localFindMask(maskDir, string(imageId), lesion.suffix);
            row.(lesion.column) = maskPath;
            row.("has_" + lesion.column) = strlength(maskPath) > 0;
        end

        splitRows = [splitRows; row]; %#ok<AGROW>
    end

    rows = [rows; splitRows]; %#ok<AGROW>
end

indexTable = rows;

outputDir = fullfile(repoRoot, 'data', 'indexes');
if ~isfolder(outputDir)
    mkdir(outputDir);
end

outputCsv = fullfile(outputDir, 'idrid_lesion_segmentation.csv');
writetable(indexTable, outputCsv);

fprintf('Wrote IDRiD lesion index: %s\n', outputCsv);
fprintf('Images: %d\n', height(indexTable));
for lesionIdx = 1:numel(lesions)
    lesion = lesions(lesionIdx);
    fprintf('  %s masks: %d\n', lesion.column, sum(indexTable.("has_" + lesion.column)));
end
end

function lesions = localLesionDefinitions()
lesions = struct( ...
    'column', {'microaneurysm_mask_path', 'hemorrhage_mask_path', 'hard_exudate_mask_path', 'soft_exudate_mask_path', 'optic_disc_mask_path'}, ...
    'folder', {'1. Microaneurysms', '2. Haemorrhages', '3. Hard Exudates', '4. Soft Exudates', '5. Optic Disc'}, ...
    'suffix', {'_MA', '_HE', '_EX', '_SE', '_OD'} ...
);
end

function files = localListImages(imageDir)
extensions = {'*.jpg', '*.jpeg', '*.png', '*.tif', '*.tiff'};
files = [];
for idx = 1:numel(extensions)
    files = [files; dir(fullfile(imageDir, extensions{idx}))]; %#ok<AGROW>
end
[~, order] = sort(string({files.name}));
files = files(order);
end

function maskPath = localFindMask(maskDir, imageId, suffix)
maskPath = "";
if ~isfolder(maskDir)
    return;
end

patterns = [
    imageId + string(suffix) + ".*"
    imageId + "*" + string(suffix) + ".*"
];

for patternIdx = 1:numel(patterns)
    matches = dir(fullfile(maskDir, char(patterns(patternIdx))));
    if ~isempty(matches)
        maskPath = string(fullfile(matches(1).folder, matches(1).name));
        return;
    end
end
end
