# Publishing Guide

This guide explains how to publish the HashConnect SDK to npm as `@hashpass/connect`.

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **Organization** (Optional): Create `@hashconnect` organization on npm
3. **Git Repository**: Ensure your code is pushed to GitHub
4. **Node.js**: Version 16 or higher

## Pre-Publishing Checklist

- [ ] All tests pass
- [ ] Code is properly linted
- [ ] Documentation is up to date (README.md, REACT.md)
- [ ] CHANGELOG.md is updated with new version
- [ ] Version number is updated in package.json
- [ ] Build succeeds without errors

## Publishing Steps

### 1. Update Version

Follow [Semantic Versioning](https://semver.org/):

```bash
# For patch release (bug fixes)
npm version patch

# For minor release (new features, backwards compatible)
npm version minor

# For major release (breaking changes)
npm version major
```

Or manually update `package.json`:

```json
{
  "version": "1.0.0"
}
```

### 2. Update Changelog

Add release notes to `CHANGELOG.md`:

```markdown
## [1.0.1] - 2025-11-08

### Fixed

- Fixed reconnection issue after disconnect

### Added

- New feature X
```

### 3. Build the Package

```bash
npm run build
```

Verify the build output in `dist/`:

- `dist/hash-connect.js` should exist
- Check file size (should be ~25KB minified)

### 4. Test Locally (Optional)

Test the package locally before publishing:

```bash
# Create a tarball
npm pack

# Install in another project to test
cd /path/to/test-project
npm install /path/to/hash-connect-sdk/hashconnect-sdk-1.0.0.tgz
```

### 5. Login to NPM

```bash
npm login
```

Enter your npm credentials:

- Username
- Password
- Email
- 2FA code (if enabled)

### 6. Publish to NPM

For scoped package (@hashpass/connect):

```bash
npm publish --access public
```

For unscoped package (not recommended):

```bash
npm publish
```

### 7. Verify Publication

Check that your package is published:

```bash
npm view @hashpass/connect
```

Or visit: https://www.npmjs.com/package/@hashpass/connect

### 8. Tag Release in Git

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 9. Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Select the tag you just created
4. Add release notes from CHANGELOG.md
5. Publish release

## Post-Publishing

### Update Documentation

If you've published to npm, update installation instructions in README.md if needed.

### Announce

- Post on social media
- Update project website
- Notify users via email/newsletter
- Update example projects

## Unpublishing (Emergency Only)

⚠️ **Warning**: Unpublishing is discouraged and has restrictions:

- Can only unpublish within 72 hours
- Affects all users

```bash
npm unpublish @hashpass/connect@1.0.0
```

## Updating an Existing Version

You **cannot** update an already published version. Instead:

1. Increment version number
2. Publish new version
3. Users can update with `npm update`

## Publishing Beta/Alpha Versions

For pre-release versions:

```bash
# Update version to beta
npm version 1.1.0-beta.0

# Publish with beta tag
npm publish --tag beta

# Install beta version
npm install @hashpass/connect@beta
```

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in: `npm whoami`
- Check organization membership
- Verify package name isn't taken

### "Package name too similar to existing package"

- Change package name in `package.json`
- Use scoped package: `@yourorg/package-name`

### Build Fails

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules
npm install
npm run build
```

### "prepublishOnly script failed"

The build automatically runs before publishing. Fix any build errors before publishing.

## Automated Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          registry-url: "https://registry.npmjs.org"
      - run: npm install
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to your GitHub repository secrets.

## Version Strategy

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features, backwards compatible (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backwards compatible (1.0.0 → 1.0.1)

### Pre-release Versions

- Alpha: `1.0.0-alpha.1`
- Beta: `1.0.0-beta.1`
- Release Candidate: `1.0.0-rc.1`

## Support

For publishing issues:

- NPM Support: https://www.npmjs.com/support
- GitHub Issues: https://github.com/bitlabs/hash-connect-sdk/issues
