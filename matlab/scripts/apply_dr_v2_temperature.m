function probabilities = apply_dr_v2_temperature(scores, temperature)
%APPLY_DR_V2_TEMPERATURE Temperature scaling of a five-class softmax output.
assert(ismatrix(scores) && size(scores,2) == 5 && ~isempty(scores), 'Expected N-by-5 scores.');
assert(all(isfinite(scores), 'all') && all(scores >= 0, 'all'), 'Invalid probability scores.');
assert(all(abs(sum(scores,2) - 1) < 1e-3), 'Model output must be softmax probabilities.');
assert(isscalar(temperature) && isfinite(temperature) && temperature > 0, 'Invalid temperature.');
logits = log(max(double(scores), 1e-12)) / temperature;
logits = logits - max(logits, [], 2);
probabilities = exp(logits) ./ sum(exp(logits), 2);
end
