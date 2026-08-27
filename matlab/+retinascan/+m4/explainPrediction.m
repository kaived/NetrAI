function explanation = explainPrediction(image, grade, segments, cfg)
%EXPLAINPREDICTION Placeholder explanation output for clinician review.

enabled = localGet(cfg, 'enabled', true);
method = localGet(cfg, 'method', 'grad_cam');

if isempty(image) || ~enabled
    explanation = struct( ...
        'method', 'not_applied', ...
        'heatmap', [], ...
        'notes', {{'Explanation skipped.'}}, ...
        'reviewGuidance', 'Review unavailable.' ...
    );
    return;
end

imageSize = size(image);
heatmap = zeros(imageSize(1), imageSize(2));

notes = {['Placeholder ', method, ' heatmap. Replace with model-specific gradients.']};
if isfield(segments, 'enabled') && segments.enabled
    notes{end + 1} = 'Segmentation masks were available for explanation context.';
end

if grade.referableDR
    guidance = 'Refer to ophthalmologist for priority review.';
else
    guidance = 'No referable DR detected by screening model. Follow local screening schedule.';
end

explanation = struct( ...
    'method', method, ...
    'heatmap', heatmap, ...
    'notes', {notes}, ...
    'reviewGuidance', guidance ...
);
end

function value = localGet(cfg, fieldName, defaultValue)
if isstruct(cfg) && isfield(cfg, fieldName)
    value = cfg.(fieldName);
else
    value = defaultValue;
end
end
