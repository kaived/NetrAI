function calibration = calibrate_dr_v2(scores, grades, minimumSensitivity, minimumSpecificity)
%CALIBRATE_DR_V2 Fit only on the explicitly reserved calibration partition.
if nargin < 3, minimumSensitivity = 0.90; end
if nargin < 4, minimumSpecificity = 0.85; end
grades = double(grades(:));
assert(any(grades>=2) && any(grades<2), 'Calibration requires both referral classes.');
scores = apply_dr_v2_temperature(scores,1);
temperature = fminbnd(@(t) localNll(scores,grades,t), 0.25, 5);
probabilities = apply_dr_v2_temperature(scores,temperature);
thresholds = (0:0.005:1)';
[~,predicted] = max(probabilities,[],2);
referable = sum(probabilities(:,3:5),2);
truth = grades>=2;
sensitivity = zeros(size(thresholds)); specificity = sensitivity;
for k = 1:numel(thresholds)
    positive = referable>=thresholds(k) | predicted>=3;
    sensitivity(k) = nnz(positive & truth)/nnz(truth);
    specificity(k) = nnz(~positive & ~truth)/nnz(~truth);
end
eligible = sensitivity>minimumSensitivity & specificity>minimumSpecificity;
targetMet = any(eligible);
if ~targetMet, eligible = sensitivity>minimumSensitivity; end
candidates = find(eligible);
assert(~isempty(candidates), 'No threshold satisfies the sensitivity constraint.');
[~,order] = sortrows([-specificity(candidates), -sensitivity(candidates), thresholds(candidates)]);
best = candidates(order(1));
calibration = struct('temperature',temperature,'referable_threshold',thresholds(best), ...
    'target_sensitivity',minimumSensitivity,'target_specificity',minimumSpecificity, ...
    'calibration_targets_met',targetMet, 'fit_partition','calibration', ...
    'decision_rule','sum(P(grade2:grade4)) >= threshold OR predicted ICDR grade >= 2', ...
    'raw_metrics',score_dr_v2_probabilities(scores,grades,0.5), ...
    'calibrated_metrics',score_dr_v2_probabilities(probabilities,grades,thresholds(best)), ...
    'threshold_grid',[thresholds sensitivity specificity]);
end

function loss = localNll(scores,grades,temperature)
probabilities = apply_dr_v2_temperature(scores,temperature);
loss = -mean(log(max(probabilities(sub2ind(size(probabilities),(1:numel(grades))',grades+1)),1e-12)));
end
