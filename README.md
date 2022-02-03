auth0-portfolio-config
======================

This repository contains my current Auth0 tenant configurations.

Changes made to the `main` branch are deployed automatically to the Auth0 tenant via GitHub actions. As such, teams adding or updating their own app configurations are required to submit changes adhering to the following workflow:

1. Clone this repository
2. Create a feature branch off of `main`. E.g., `git checkout -b config/myapp-callback-update`
3. Update the relevant configurations contained in the `settings/` folder of this repository
4. Commit changes and push
5. Submit pull request via GitHub

Assuming the changes submitted are well-formed and only impact the target app, they will reviewed, approved, merged into `main`, and deployed. Upon successful deployment, the _feature_ branch will be deleted.

# Setup

This installs the modules required for testing:

```
npm install
```

# Test

All tests must pass before merging to `main`. This is enforced through GitHub [Actions](https://github.com/features/actions).

```
npm test
```

_2022-2-3_: tests aren't required for the moment because there's no hokey code to test. For examples of how to test, refer to the [archives](https://github.com/WhatDanDoes/auth0-portfolio-config/tree/archive/example-test-specs).

# Under the hood

This section is included as a reference and resource for the curious. Teams updating app configurations _do not_ use the CLI tool directly. Export operations are executed with GitHub Actions.

The configs contained in this repository are saved and restored with the [Deploy CLI Tool](https://auth0.com/docs/deploy/deploy-cli-tool/install-and-configure-the-deploy-cli-tool). This requires that the [auth0-deploy-cli-extension](https://auth0.com/docs/deploy/deploy-cli-tool/create-and-configure-the-deploy-cli-application) be installed and configured on the tenant.

## Configure

Upon execution, the `a0deploy` tool obtains authentication credentials and other configurations from the `portfolio-config.json` file:

```
cp portfolio-config.json.example portfolio-config.json
```

Change the _example_ settings therein as appropriate.

## Export

The exported files contained in the `/settings` directory of this repository were obtained like this:

```
a0deploy export --config_file portfolio-config.json --format directory --output_folder settings
```

You may also export to a `yaml` file:

```
a0deploy export --config_file portfolio-config.json --format yaml --output_folder yaml
```

## Import

When `portfolio` tenant configurations needs to be moved or reset, execute the following:

```
a0deploy import --config_file portfolio-config.json --input_file /path/to/auth0-portfolio-config/settings
```

### Making destructive changes

The `AUTH0_ALLOW_DELETE` setting in `portfolio-config.json` is set to `false` as a safeguard. If a configuration file is removed from `settings/`, the corresponding configuration will not be removed from Auth0. Set this value to `true`:

```
  "AUTH0_ALLOW_DELETE": true,
```

