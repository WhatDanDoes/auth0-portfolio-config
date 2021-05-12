silid-infra-auth0
=================

This repository contains the current Auth0 `silid` tenant configurations.

These configs are saved and restored with the [Deploy CLI Tool](https://auth0.com/docs/deploy/deploy-cli-tool/install-and-configure-the-deploy-cli-tool). This requires that the [autho-deploy-cli-extension](https://auth0.com/docs/deploy/deploy-cli-tool/create-and-configure-the-deploy-cli-application) be installed and configured on the tenant.

# Configure

Upon execution, the `a0deploy` tool obtains authentication credentials and other configurations from the `silid-config.json` file:

```
cp silid-config.json.example silid-config.json
```

Change the _example_ settings therein as appropriate.

# Export

The exported files contained in the `/settings` directory of this repository were obtained like this:

```
a0deploy export --config_file silid-config.json --format directory --output_folder settings
```

You may also export to a `yaml` file:

```
a0deploy export --config_file silid-config.json --format yaml --output_folder yaml
```

# Import

When `silid` tenant configurations needs to be moved or reset, execute the following:

```
a0deploy import --config_file silid-config.json --input_file /path/to/silid-infra-auth0/settings
```

