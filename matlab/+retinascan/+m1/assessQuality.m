function quality = assessQuality(image, cfg)
%ASSESSQUALITY Heuristic fundus image quality gate.

gray = localGray255(image);

focusScore = var(gray(:));
brightness = mean(gray(:)) / 255.0;
contrast = std(gray(:)) / 255.0;

minFocus = localGet(cfg, 'min_focus_score', 120.0);
minBrightness = localGet(cfg, 'min_brightness', 0.15);
maxBrightness = localGet(cfg, 'max_brightness', 0.90);
minContrast = localGet(cfg, 'min_contrast', 0.05);

reasons = {};
if focusScore < minFocus
    reasons{end + 1} = 'Image may be out of focus. Recapture with steadier alignment.';
end
if brightness < minBrightness
    reasons{end + 1} = 'Image is too dark. Increase illumination or recapture.';
end
if brightness > maxBrightness
    reasons{end + 1} = 'Image is too bright. Reduce glare or recapture.';
end
if contrast < minContrast
    reasons{end + 1} = 'Image contrast is too low. Recapture or enhance before grading.';
end

quality = struct( ...
    'isGradeable', isempty(reasons), ...
    'focusScore', focusScore, ...
    'brightness', brightness, ...
    'contrast', contrast, ...
    'reasons', {reasons} ...
);
end

function value = localGet(cfg, fieldName, defaultValue)
if isstruct(cfg) && isfield(cfg, fieldName)
    value = cfg.(fieldName);
else
    value = defaultValue;
end
end

function gray = localGray255(image)
imageDouble = double(image);
if max(imageDouble(:)) <= 1.0
    imageDouble = imageDouble * 255.0;
end

if ndims(imageDouble) == 3
    gray = 0.2989 * imageDouble(:, :, 1) + 0.5870 * imageDouble(:, :, 2) + 0.1140 * imageDouble(:, :, 3);
else
    gray = imageDouble;
end
end
