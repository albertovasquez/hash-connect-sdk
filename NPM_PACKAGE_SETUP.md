# NPM Package Setup Summary

This document summarizes the changes made to prepare the HashConnect SDK for npm publishing as `@hashconnect/sdk`.

## Changes Made

### 1. Fixed Reconnection Issue ✅

**File**: `src/domains/UserAgent/entity.ts`

**Problem**: After disconnecting, users had to refresh the page to reconnect because the old session/channel state wasn't being cleared.

**Solution**:

- Reset `sessionId`, `QRCodeString`, and `SessionChannelName` to `null` on disconnect
- Generate new session credentials on each connection attempt

**Result**: Users can now disconnect and reconnect without page refresh.

---

### 2. Package Configuration

**File**: `package.json`

Updated to proper npm package format:

```json
{
  "name": "@hashconnect/sdk",
  "version": "1.0.0",
  "description": "HashConnect SDK - Secure authentication and wallet integration for web applications",
  "main": "dist/hash-connect.js",
  "types": "types/global.d.ts",
  "files": ["dist", "types", "README.md", "REACT.md"],
  "license": "MIT",
  "author": "BitLabs"
}
```

Key changes:

- ✅ Scoped package name: `@hashpass/connect`
- ✅ Proper description and keywords
- ✅ Entry point specified
- ✅ TypeScript types included
- ✅ Files to publish specified
- ✅ `prepublishOnly` script for automatic builds
- ✅ Repository and homepage links

---

### 3. Documentation Files Created

#### **REACT.md** (2.8 KB)

Comprehensive React integration guide including:

- ✅ Basic React component integration
- ✅ Custom `useHashConnect` hook
- ✅ Context Provider pattern
- ✅ TypeScript definitions
- ✅ Next.js integration examples
- ✅ Event handling
- ✅ Styling customization

#### **README.md** (Updated)

Professional npm package documentation:

- ✅ Installation instructions (npm/yarn/CDN)
- ✅ Quick start examples
- ✅ Complete API reference
- ✅ Event documentation
- ✅ Styling guide
- ✅ Browser support
- ✅ Security information
- ✅ Troubleshooting section

#### **PUBLISHING.md** (7.2 KB)

Step-by-step publishing guide:

- ✅ Prerequisites and checklist
- ✅ Version management
- ✅ Local testing instructions
- ✅ Publishing steps
- ✅ GitHub Actions automation
- ✅ Troubleshooting common issues

#### **INTEGRATION_EXAMPLES.md** (12.4 KB)

Real-world integration examples:

- ✅ Vanilla JavaScript
- ✅ React with hooks
- ✅ React Context Provider
- ✅ Next.js (App Router & Pages Router)
- ✅ Vue 3 Composition API
- ✅ Authenticated API client
- ✅ Protected routes/gated content

#### **CHANGELOG.md**

Version history tracking:

- ✅ Initial 1.0.0 release notes
- ✅ Feature list
- ✅ Planned features section

#### **LICENSE**

MIT License file included.

#### **.npmignore**

Excludes unnecessary files from npm package:

- ✅ Source files (src/)
- ✅ Build configs
- ✅ Development files
- ✅ IDE files

---

## File Structure

```
hash-connect-sdk/
├── dist/
│   └── hash-connect.js          # Built SDK (24.7 KB minified)
├── src/                          # Source files (not published)
├── types/
│   └── global.d.ts              # TypeScript definitions
├── package.json                  # NPM package config
├── README.md                     # Main documentation
├── REACT.md                      # React integration guide
├── PUBLISHING.md                 # Publishing instructions
├── INTEGRATION_EXAMPLES.md       # Framework examples
├── CHANGELOG.md                  # Version history
├── LICENSE                       # MIT License
├── .npmignore                   # NPM exclusions
└── webpack.config.js            # Build configuration
```

---

## How to Publish

### Quick Start

```bash
# 1. Update version
npm version patch  # or minor, or major

# 2. Build (automatic with prepublishOnly)
npm run build

# 3. Login to npm
npm login

# 4. Publish
npm publish --access public
```

### First-Time Setup

1. **Create npm account**: https://www.npmjs.com/signup
2. **Create @hashconnect organization** (optional but recommended):

   - Go to https://www.npmjs.com/org/create
   - Create organization named `hashconnect`
   - Invite team members

3. **Update package.json** if you're NOT using the @hashconnect org:
   ```json
   {
     "name": "your-package-name",
     // or
     "name": "@your-org/hash-connect-sdk"
   }
   ```

---

## Installation for Users

Once published, users can install via:

```bash
# NPM
npm install @hashpass/connect

# Yarn
yarn add @hashpass/connect

# CDN
<script src="https://unpkg.com/@hashpass/connect/dist/hash-connect.js"></script>
```

---

## React Integration Quick Start

After publishing, users can integrate in React:

```tsx
import { useHashConnect } from "./hooks/useHashConnect";

function App() {
  const { isConnected, userAddress, connect } = useHashConnect();

  return (
    <div>
      {isConnected ? (
        <p>Connected: {userAddress}</p>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
}
```

---

## What's Included in the Package

When users install `@hashpass/connect`, they get:

✅ **dist/hash-connect.js** - Minified SDK (24.7 KB)  
✅ **types/global.d.ts** - TypeScript definitions  
✅ **README.md** - Main documentation  
✅ **REACT.md** - React integration guide  
✅ **LICENSE** - MIT license

---

## Testing Before Publishing

Test the package locally before publishing:

```bash
# Create tarball
npm pack

# This creates: hashconnect-sdk-1.0.0.tgz

# Install in test project
cd /path/to/test-project
npm install /path/to/hash-connect-sdk/hashconnect-sdk-1.0.0.tgz

# Test integration
# ... your tests ...

# Remove test tarball when done
cd /path/to/hash-connect-sdk
rm hashconnect-sdk-1.0.0.tgz
```

---

## Version Strategy

Follow Semantic Versioning (SemVer):

- **1.0.0** → **1.0.1**: Bug fixes (PATCH)
- **1.0.0** → **1.1.0**: New features, backwards compatible (MINOR)
- **1.0.0** → **2.0.0**: Breaking changes (MAJOR)

Pre-release versions:

- `1.0.0-alpha.1` - Alpha release
- `1.0.0-beta.1` - Beta release
- `1.0.0-rc.1` - Release candidate

---

## Automated Publishing (Optional)

Set up GitHub Actions for automatic publishing:

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

Then add `NPM_TOKEN` to GitHub repository secrets.

---

## Next Steps

1. ✅ **Review Documentation**: Read through README.md and REACT.md
2. ✅ **Test Locally**: Use dist/index.html to test the SDK
3. ✅ **Update Repository Info**: Update GitHub URL in package.json
4. ✅ **Create Git Tag**: Tag v1.0.0 in git
5. ✅ **Publish to NPM**: Follow PUBLISHING.md guide
6. ✅ **Create GitHub Release**: Add release notes
7. ✅ **Update Website**: Link to npm package
8. ✅ **Announce**: Share on social media, forums, etc.

---

## Support & Resources

- **Main Docs**: [README.md](./README.md)
- **React Guide**: [REACT.md](./REACT.md)
- **Examples**: [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)
- **Publishing**: [PUBLISHING.md](./PUBLISHING.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

## Questions?

If you have questions about the setup or publishing process:

- Check [PUBLISHING.md](./PUBLISHING.md) for detailed instructions
- Review [npm documentation](https://docs.npmjs.com/)
- Open an issue on GitHub

---

**Status**: ✅ Ready for publishing!

The package is now properly configured and ready to be published to npm as `@hashpass/connect`.
