# Config

As not all are built through our CDK projects (e.g. the EKS cluster) we need to have a way to configure the Layer3CDK. This package contains the configurations for the Layer3CDK.

As we move forward some of the configurations will be moved to SSM parameters and this package will be used to get the values from SSM and apply logic based on the environment.

## EKS Cluster Configurations

The EKS cluster configurations are in the [EksClusterConfig](./config.eks.cluster.ts) file. The configurations are:

- `namespaceRule` - Which namespace to use in which env.
- `OIDCProvider` - The OIDC provider for the cluster in each env.