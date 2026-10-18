-- A provider refund transaction can settle at most one local refund request.
CREATE UNIQUE INDEX refunds_provider_reference_unique ON refunds(provider_reference) WHERE provider_reference IS NOT NULL;
