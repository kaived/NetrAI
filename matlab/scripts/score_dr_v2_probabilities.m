function metrics = score_dr_v2_probabilities(probabilities, grades, threshold)
%SCORE_DR_V2_PROBABILITIES Fixed operating-point screening and calibration metrics.
probabilities = apply_dr_v2_temperature(probabilities, 1);
grades = double(grades(:));
assert(numel(grades) == size(probabilities,1) && all(ismember(grades,0:4)), 'Invalid labels.');
[confidence, predicted] = max(probabilities, [], 2);
predicted = predicted - 1;
referableScore = sum(probabilities(:,3:5),2);
% Never downgrade a Grade 2+ prediction because of a high probability threshold.
positive = referableScore >= threshold | predicted >= 2;
truth = grades >= 2;
tp = sum(positive & truth); tn = sum(~positive & ~truth);
fp = sum(positive & ~truth); fn = sum(~positive & truth);
confusion = accumarray([grades+1 predicted+1], 1, [5 5]);
support = sum(confusion,2);
recall = diag(confusion) ./ support;
precision = diag(confusion) ./ sum(confusion,1)';
f1 = 2 * diag(confusion) ./ (sum(confusion,1)' + support);
expected = sum(confusion,2) * sum(confusion,1) / numel(grades);
weights = ((0:4)' - (0:4)).^2 / 16;
qwk = 1 - sum(weights .* confusion,'all') / sum(weights .* expected,'all');
auc = NaN;
if any(truth) && any(~truth), [~,~,~,auc] = perfcurve(truth,referableScore,true); end
onehot = double(grades == 0:4);
ece = 0;
bins = zeros(10,4);
for k = 1:10
    included = confidence > (k-1)/10 & confidence <= k/10;
    count = nnz(included);
    bins(k,:) = [k/10 count NaN NaN];
    if count > 0
        accuracy = mean(predicted(included) == grades(included));
        meanConfidence = mean(confidence(included));
        bins(k,3:4) = [accuracy meanConfidence];
        ece = ece + count/numel(grades)*abs(accuracy-meanConfidence);
    end
end
uncertain = confidence < 0.70 | abs(referableScore-threshold) < 0.05;
metrics = struct('sample_count',numel(grades), 'accuracy',mean(predicted==grades), ...
    'class_names',{{'no_dr','mild','moderate','severe','proliferative_dr'}}, ...
    'balanced_accuracy',mean(recall,'omitnan'), 'macro_f1',mean(f1,'omitnan'), ...
    'quadratic_weighted_kappa',qwk, 'confusion_matrix',confusion, ...
    'class_recall',recall, 'class_precision',precision, 'class_f1',f1, 'class_support',support, ...
    'referable_threshold',threshold, 'referable_dr_sensitivity',tp/(tp+fn), ...
    'referable_dr_specificity',tn/(tn+fp), 'referable_dr_precision',tp/(tp+fp), ...
    'referable_dr_f1',2*tp/(2*tp+fp+fn), 'referable_dr_auc',auc, ...
    'true_positive',tp, 'true_negative',tn, 'false_positive',fp, 'false_negative',fn, ...
    'sensitivity_ci95',localWilson(tp,tp+fn), 'specificity_ci95',localWilson(tn,tn+fp), ...
    'multiclass_brier',mean(sum((probabilities-onehot).^2,2)), ...
    'negative_log_likelihood',-mean(log(max(probabilities(sub2ind(size(probabilities),(1:numel(grades))',grades+1)),1e-12))), ...
    'expected_calibration_error',ece, 'reliability_bins',bins, ...
    'manual_review_count',nnz(uncertain), 'manual_review_fraction',mean(uncertain), ...
    'manual_review_rule','confidence < 0.70 or distance from referral threshold < 0.05; provisional', ...
    'meets_point_targets',tp/(tp+fn)>0.90 && tn/(tn+fp)>0.85);
end

function interval = localWilson(successes,total)
if total == 0, interval = [NaN NaN]; return; end
z = 1.95996398454005; p = successes/total;
center = (p+z*z/(2*total))/(1+z*z/total);
radius = z*sqrt(p*(1-p)/total+z*z/(4*total^2))/(1+z*z/total);
interval = [max(0,center-radius) min(1,center+radius)];
end
