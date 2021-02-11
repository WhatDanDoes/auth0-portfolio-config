# silid-infra-auth0
[EXPERIMENTAL] building sample configs to help with migration

# Configure:

```
cp silid-igration-config.json.example silid-igration-config.json
```


## Export

```
a0deploy export --config_file silid-migration-config.json --format yaml --output_folder silid-migration
a0deploy export --config_file silid-migration-config.json --format directory --output_folder silid-migration
```

## Import

```
a0deploy import --config_file silid-migration-config.json --input_file /path/to/silid-infra-auth0/settings
```


