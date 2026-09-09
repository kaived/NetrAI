function indexTable = build_drive_index(repoRoot)
%BUILD_DRIVE_INDEX Build an image/mask index for DRIVE vessel segmentation.
%
% Output:
%   <repo-root>/data/indexes/drive_vessels.csv

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
driveRoot = fullfile(repoRoot, 'data', 'raw', 'drive');
assert(isfolder(driveRoot), 'DRIVE folder not found: %s', driveRoot);

splits = ["training", "testing"];
rows = table();

for splitName = splits
    splitRoot = fullfile(driveRoot, char(splitName));
    imageDir = fullfile(splitRoot, 'images');
    assert(isfolder(imageDir), 'DRIVE image folder not found: %s', imageDir);

    imageFiles = localListImages(imageDir);
    for idx = 1:numel(imageFiles)
        imagePath = string(fullfile(imageFiles(idx).folder, imageFiles(idx).name));
        [~, imageId, ~] = fileparts(imagePath);
        numericId = extractBefore(imageId, "_");
        if strlength(numericId) == 0
            numericId = imageId;
        end

        vesselMaskPath = "";
        if splitName == "training"
            vesselMaskPath = localFindFirst(fullfile(splitRoot, '1st_manual'), [
                numericId + "_manual1.*"
                numericId + "*manual*.*"
            ]);
        end

        fieldMaskPath = localFindFirst(fullfile(splitRoot, 'mask'), [
            imageId + "_mask.*"
            numericId + "*" + splitName + "_mask.*"
            numericId + "*mask*.*"
        ]);

        row = table( ...
            imagePath, ...
            string(imageId), ...
            splitName, ...
            vesselMaskPath, ...
            fieldMaskPath, ...
            strlength(vesselMaskPath) > 0, ...
            strlength(fieldMaskPath) > 0, ...
            'VariableNames', {'image_path', 'image_id', 'split', 'vessel_mask_path', 'field_mask_path', 'has_vessel_mask', 'has_field_mask'} ...
        );
        rows = [rows; row]; %#ok<AGROW>
    end
end

indexTable = rows;

outputDir = fullfile(repoRoot, 'data', 'indexes');
if ~isfolder(outputDir)
    mkdir(outputDir);
end

outputCsv = fullfile(outputDir, 'drive_vessels.csv');
writetable(indexTable, outputCsv);

fprintf('Wrote DRIVE vessel index: %s\n', outputCsv);
fprintf('Images: %d\n', height(indexTable));
fprintf('Training vessel masks: %d\n', sum(indexTable.has_vessel_mask & indexTable.split == "training"));
fprintf('Field-of-view masks: %d\n', sum(indexTable.has_field_mask));
end

function files = localListImages(imageDir)
extensions = {'*.jpg', '*.jpeg', '*.png', '*.tif', '*.tiff', '*.gif'};
files = [];
for idx = 1:numel(extensions)
    files = [files; dir(fullfile(imageDir, extensions{idx}))]; %#ok<AGROW>
end
[~, order] = sort(string({files.name}));
files = files(order);
end

function foundPath = localFindFirst(folderPath, patterns)
foundPath = "";
if ~isfolder(folderPath)
    return;
end

for idx = 1:numel(patterns)
    matches = dir(fullfile(folderPath, char(patterns(idx))));
    if ~isempty(matches)
        foundPath = string(fullfile(matches(1).folder, matches(1).name));
        return;
    end
end
end
