function result = run_retinascan_demo(imagePath, configPath)
%RUN_RETINASCAN_DEMO Run the current end-to-end MATLAB pipeline.
%
% Use without arguments to run a synthetic smoke test:
%   result = run_retinascan_demo()

if nargin < 2 || isempty(configPath)
    thisDir = fileparts(mfilename('fullpath'));
    configPath = fullfile(thisDir, '..', 'configs', 'retinascan.example.json');
end

cfg = retinascan.loadConfig(configPath);

if nargin < 1 || isempty(imagePath)
    image = localSyntheticFundus();
else
    image = retinascan.io.readFundusImage(imagePath);
end

result = retinascan.runPipeline(image, cfg);

disp(result.report.summary);
disp(result.report.recommendation);
end

function image = localSyntheticFundus()
[xGrid, yGrid] = meshgrid(linspace(-1, 1, 512), linspace(-1, 1, 512));
retinaMask = xGrid.^2 + yGrid.^2 <= 0.88;

image = zeros(512, 512, 3, 'uint8');
image(:, :, 1) = uint8(95 * retinaMask);
image(:, :, 2) = uint8(125 * retinaMask);
image(:, :, 3) = uint8(55 * retinaMask);

opticDisc = (xGrid - 0.35).^2 + (yGrid + 0.05).^2 <= 0.025;
image(:, :, 1) = image(:, :, 1) + uint8(80 * opticDisc);
image(:, :, 2) = image(:, :, 2) + uint8(70 * opticDisc);
end
