import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Automatic Project Discovery',
    Svg: require('@site/static/img/terraform-discovery.svg').default,
    description: (
      <>
        Automatically discovers Terraform projects by looking for <code>main.tf</code> files
        in your workspace. No manual configuration required.
      </>
    ),
  },
  {
    title: 'Inferred Tasks',
    Svg: require('@site/static/img/terraform-tasks.svg').default,
    description: (
      <>
        Automatically creates Terraform targets (init, plan, apply, destroy, validate, fmt, output)
        for each discovered project. Use Nx commands to manage your infrastructure.
      </>
    ),
  },
  {
    title: 'Smart Dependencies',
    Svg: require('@site/static/img/terraform-dependencies.svg').default,
    description: (
      <>
        Automatic dependency management between Terraform projects ensures proper execution order.
        Module references are detected automatically from your Terraform code.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
