function image = readFundusImage(imagePath)
%READFUNDUSIMAGE Read a fundus image and normalize shape to RGB.

if nargin < 1 || isempty(imagePath)
    error('retinascan:MissingImagePath', 'An image path is required.');
end

if ~isfile(imagePath)
    error('retinascan:ImageNotFound', 'Image file not found: %s', imagePath);
end

image = imread(imagePath);

if ndims(image) == 2
    image = repmat(image, [1, 1, 3]);
end

if size(image, 3) > 3
    image = image(:, :, 1:3);
end
end
