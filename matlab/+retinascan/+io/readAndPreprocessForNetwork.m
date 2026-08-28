function imageOut = readAndPreprocessForNetwork(filename, inputSize)
%READANDPREPROCESSFORNETWORK Read a fundus image for classifier training/inference.
%
% This function is used by imageDatastore so every image reaches the network
% with the same shape and numeric range.

if nargin < 2 || isempty(inputSize)
    inputSize = [224 224 3];
end

image = imread(filename);

if ndims(image) == 2
    image = repmat(image, [1 1 3]);
end

if size(image, 3) > 3
    image = image(:, :, 1:3);
end

cfg = struct('use_clahe', true);
preprocessed = retinascan.m1.preprocessImage(image, cfg);
imageOut = preprocessed.image;

if size(imageOut, 3) == 1
    imageOut = repmat(imageOut, [1 1 3]);
end

imageOut = imresize(imageOut, inputSize(1:2));
imageOut = im2single(imageOut);
end
