silid-infra-auth0
=================

This repository contains the current Auth0 `silid` tenant configurations.

Changes made to the `main` branch are deployed automatically to the Auth0 tenant via GitHub actions. As such, teams adding or updating their own app configurations are required to submit changes adhering to the following workflow:

1. Clone this repository
2. Create a feature branch off of `main`. E.g., `git checkout -b config/myapp-callback-update`
3. Update the relevant configurations contained in the `settings/` folder of this repository
4. Commit changes and push
5. Submit pull request via GitHub

Assuming the changes submitted are well-formed and only impact the target app, they will reviewed, approved, merged into `main`, and deployed. Upon successful deployment, the _feature_ branch will be deleted.

# Under the hood

This section is included as a reference and resource for the curious. Teams updating app configurations _do not_ use the CLI tool directly. Export operations are executed with GitHub [Actions](https://github.com/features/actions).

The configs contained in this repository are saved and restored with the [Deploy CLI Tool](https://auth0.com/docs/deploy/deploy-cli-tool/install-and-configure-the-deploy-cli-tool). This requires that the [auth0-deploy-cli-extension](https://auth0.com/docs/deploy/deploy-cli-tool/create-and-configure-the-deploy-cli-application) be installed and configured on the tenant.

## Configure

Upon execution, the `a0deploy` tool obtains authentication credentials and other configurations from the `silid-config.json` file:

```
cp silid-config.json.example silid-config.json
```

Change the _example_ settings therein as appropriate.

## Export

The exported files contained in the `/settings` directory of this repository were obtained like this:

```
a0deploy export --config_file silid-config.json --format directory --output_folder settings
```

You may also export to a `yaml` file:

```
a0deploy export --config_file silid-config.json --format yaml --output_folder yaml
```

## Import

When `silid` tenant configurations needs to be moved or reset, execute the following:

```
a0deploy import --config_file silid-config.json --input_file /path/to/silid-infra-auth0/settings
```

### Making destructive changes

The `AUTH0_ALLOW_DELETE` setting in `silid-config.json` is set to `false` as a safeguard. If a configuration file is removed from `settings/`, the corresponding configuration will not be removed from Auth0. Set this value to `true`:

```
  "AUTH0_ALLOW_DELETE": true,
```
