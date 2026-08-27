function segments = segmentStructures(image, cfg)
%SEGMENTSTRUCTURES Baseline placeholder for retinal structure masks.

enabled = localGet(cfg, 'enabled', false);

imageSize = size(image);
height = imageSize(1);
width = imageSize(2);

masks = struct( ...
    'vessels', false(height, width), ...
    'opticDisc', false(height, width), ...
    'microaneurysms', false(height, width), ...
    'hemorrhages', false(height, width), ...
    'exudates', false(height, width) ...
);

findings = {'Segmentation placeholder active. Replace with trained M2 models or IDRiD mask loaders.'};

if enabled
    gray = localGrayUnit(image);
    vesselMask = gray < (mean(gray(:)) - 0.5 * std(gray(:)));
    masks.vessels = vesselMask;
    findings{end + 1} = 'Generated baseline dark-structure vessel candidate mask.';
end

segments = struct( ...
    'enabled', enabled, ...
    'masks', masks, ...
    'findings', {findings} ...
);
end

function value = localGet(cfg, fieldName, defaultValue)
if isstruct(cfg) && isfield(cfg, fieldName)
    value = cfg.(fieldName);
else
    value = defaultValue;
end
end

function gray = localGrayUnit(image)
imageDouble = double(image);
if max(imageDouble(:)) > 1.0
    imageDouble = imageDouble / 255.0;
end

if ndims(imageDouble) == 3
    gray = 0.2989 * imageDouble(:, :, 1) + 0.5870 * imageDouble(:, :, 2) + 0.1140 * imageDouble(:, :, 3);
else
    gray = imageDouble;
end
end
