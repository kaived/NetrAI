function modelPath = create_district_workflow_simulink_model(repoRoot)
%CREATE_DISTRICT_WORKFLOW_SIMULINK_MODEL Create a Simulink model scaffold.
%
% The model shows the district workflow blocks required by the SIH problem:
% arrivals, capture capacity, AI throughput, offline queue, bandwidth sync,
% and ophthalmologist review capacity.

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
assert(exist('new_system', 'file') == 2, 'Simulink is not available in this MATLAB installation.');

modelDir = fullfile(repoRoot, 'matlab', 'simulink');
if ~isfolder(modelDir)
    mkdir(modelDir);
end

modelName = 'retinascan_district_workflow';
modelPath = fullfile(modelDir, [modelName '.slx']);

if bdIsLoaded(modelName)
    close_system(modelName, 0);
end

new_system(modelName);
open_system(modelName);

localAddConstant(modelName, 'Patient arrivals per day', '400', [80 70 210 100]);
localAddConstant(modelName, 'Fundus cameras', '4', [80 150 210 180]);
localAddConstant(modelName, 'Capture min per patient', '3', [80 230 210 260]);
localAddConstant(modelName, 'AI seconds per image', '4', [80 310 210 340]);
localAddConstant(modelName, 'Offline hours per day', '2', [80 390 210 420]);
localAddConstant(modelName, 'Bandwidth Mbps', '4', [80 470 210 500]);
localAddConstant(modelName, 'Referable rate', '0.18', [80 550 210 580]);
localAddConstant(modelName, 'Review seconds per case', '30', [80 630 210 660]);

localAddAnnotation(modelName, 'Capture capacity = cameras x shift minutes / capture time', [320 145 620 190]);
localAddAnnotation(modelName, 'Offline queue grows during no-internet blocks and drains through bandwidth sync', [320 385 680 440]);
localAddAnnotation(modelName, 'Ophthalmologist review load = referable/uncertain cases x review seconds', [320 550 700 610]);
localAddAnnotation(modelName, 'Use this scaffold with Simulink blocks or SimEvents queues for final demo simulation.', [320 680 760 735]);

set_param(modelName, 'StopTime', '250');
save_system(modelName, modelPath);
close_system(modelName, 0);

fprintf('Saved Simulink workflow scaffold: %s\n', modelPath);
end

function localAddConstant(modelName, name, value, position)
blockPath = [modelName '/' name];
add_block('simulink/Sources/Constant', blockPath, 'Value', value, 'Position', position);
end

function localAddAnnotation(modelName, text, position)
annotation = Simulink.Annotation(modelName, text);
annotation.Position = position;
end
