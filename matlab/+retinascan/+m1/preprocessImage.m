function preprocessed = preprocessImage(image, cfg)
%PREPROCESSIMAGE Apply conservative enhancement for gradeable images.

imageUnit = localToUnit(image);
method = 'unit_scaling';
notes = {'Image scaled to [0, 1].'};

useClahe = localGet(cfg, 'use_clahe', true);

if useClahe && exist('adapthisteq', 'file') == 2 && ndims(imageUnit) == 3
    enhanced = imageUnit;
    enhanced(:, :, 2) = adapthisteq(imageUnit(:, :, 2));
    imageUnit = enhanced;
    method = 'green_channel_clahe';
    notes{end + 1} = 'Applied CLAHE to green channel.';
end

preprocessed = struct( ...
    'image', imageUnit, ...
    'method', method, ...
    'notes', {notes} ...
);
end

function value = localGet(cfg, fieldName, defaultValue)
if isstruct(cfg) && isfield(cfg, fieldName)
    value = cfg.(fieldName);
else
    value = defaultValue;
end
end

function imageUnit = localToUnit(image)
imageUnit = double(image);
maxValue = max(imageUnit(:));

if maxValue > 1.0
    imageUnit = imageUnit / 255.0;
end

imageUnit = min(max(imageUnit, 0.0), 1.0);
end
