function report = buildClinicalReport(quality, grade, explanation, cfg)
%BUILDCLINICALREPORT Build a compact clinician-facing summary.

includeDisclaimer = localGet(cfg, 'include_disclaimer', true);
disclaimer = localGet(cfg, 'disclaimer', 'Screening support only. Final clinical decision requires ophthalmologist review.');

if ~quality.isGradeable
    summary = 'Image rejected by quality gate. No DR grade assigned.';
    recommendation = strjoin(quality.reasons, ' ');
elseif grade.referableDR
    summary = sprintf('Screening result: referable DR suspected. ICDR level %.0f, confidence %.2f.', grade.icdrLevel, grade.confidence);
    recommendation = explanation.reviewGuidance;
else
    summary = sprintf('Screening result: no referable DR detected. ICDR level %.0f, confidence %.2f.', grade.icdrLevel, grade.confidence);
    recommendation = explanation.reviewGuidance;
end

report = struct( ...
    'summary', summary, ...
    'recommendation', recommendation, ...
    'disclaimer', localConditionalDisclaimer(includeDisclaimer, disclaimer) ...
);
end

function value = localGet(cfg, fieldName, defaultValue)
if isstruct(cfg) && isfield(cfg, fieldName)
    value = cfg.(fieldName);
else
    value = defaultValue;
end
end

function disclaimer = localConditionalDisclaimer(includeDisclaimer, text)
if includeDisclaimer
    disclaimer = text;
else
    disclaimer = '';
end
end
