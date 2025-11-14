export interface CICDGeneratorSchema {
  ciProvider: 'github-actions';
  enableSecurityScan?: boolean;
}

export interface CICDGeneratorNormalizedSchema
  extends CICDGeneratorSchema {
  enableSecurityScan: boolean;
  awsRegion: string;
  tmpl: string;
}

