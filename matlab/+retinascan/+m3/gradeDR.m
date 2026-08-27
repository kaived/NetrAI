function grade = gradeDR(image, cfg)
%GRADEDR Placeholder DR grading interface.
%
% Replace this stub with MATLAB Deep Learning Toolbox inference or a wrapped
% Python model once the classifier prototype is validated.

modelPath = localGet(cfg, 'model_path', '');
modelVersion = 'stub-0.1.0';

if isstruct(cfg) && isfield(cfg, 'model_version')
    modelVersion = cfg.model_version;
end

if isempty(image)
    grade = struct( ...
        'icdrLevel', NaN, ...
        'classLabel', 'ungradeable', ...
        'referableDR', false, ...
        'confidence', 0.0, ...
        'modelVersion', modelVersion, ...
        'notes', {{'No image supplied to grader.'}} ...
    );
    return;
end

notes = {'Stub classifier returned no DR. Replace before reporting metrics.'};
if ~isempty(modelPath) && isfile(modelPath)
    notes{end + 1} = ['Model file detected at ', modelPath, ', but inference is not wired yet.'];
end

grade = struct( ...
    'icdrLevel', 0, ...
    'classLabel', 'no_dr', ...
    'referableDR', false, ...
    'confidence', 0.50, ...
    'modelVersion', modelVersion, ...
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
