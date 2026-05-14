const { execFile } = require('node:child_process');
const crypto = require('node:crypto');
const os = require('node:os');

const SERVICE_NAME = 'CmisPortable';

class ICredentialStore {
  async saveCredential(_credential) {
    throw new Error('ICredentialStore.saveCredential must be implemented by a concrete credential store.');
  }

  async getCredential(_credentialId) {
    throw new Error('ICredentialStore.getCredential must be implemented by a concrete credential store.');
  }

  async deleteCredential(_credentialId) {
    throw new Error('ICredentialStore.deleteCredential must be implemented by a concrete credential store.');
  }
}

class PlatformCredentialStore extends ICredentialStore {
  constructor(options = {}) {
    super();
    this.platform = options.platform ?? process.platform;
    this.serviceName = options.serviceName ?? SERVICE_NAME;
    this.execFile = options.execFile ?? runExecFile;
  }

  async saveCredential(credential) {
    const normalized = normalizeCredential(credential);

    if (this.platform === 'win32') {
      await this.saveWindowsCredential(normalized);
    } else if (this.platform === 'darwin') {
      await this.saveMacOsCredential(normalized);
    } else {
      await this.saveLinuxCredential(normalized);
    }

    return createCredentialMetadata(normalized.credentialId, this.platform, normalized.kind);
  }

  async getCredential(credentialId) {
    const id = normalizeCredentialId(credentialId);

    if (this.platform === 'win32') {
      return this.getWindowsCredential(id);
    }

    if (this.platform === 'darwin') {
      return this.getMacOsCredential(id);
    }

    return this.getLinuxCredential(id);
  }

  async deleteCredential(credentialId) {
    const id = normalizeCredentialId(credentialId);

    if (this.platform === 'win32') {
      return this.deleteWindowsCredential(id);
    }

    if (this.platform === 'darwin') {
      return this.deleteMacOsCredential(id);
    }

    return this.deleteLinuxCredential(id);
  }

  async saveWindowsCredential(credential) {
    const script = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CredMan {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags;
    public UInt32 Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }
  [DllImport("Advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredWrite([In] ref CREDENTIAL userCredential, [In] UInt32 flags);
}
"@
$target = $env:CMIS_PORTABLE_CREDENTIAL_ID
$userName = $env:CMIS_PORTABLE_USERNAME
$secret = $env:CMIS_PORTABLE_SECRET
$bytes = [Text.Encoding]::Unicode.GetBytes($secret)
$blob = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($bytes.Length)
try {
  [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blob, $bytes.Length)
  $cred = New-Object CredMan+CREDENTIAL
  $cred.Type = 1
  $cred.TargetName = $target
  $cred.UserName = $userName
  $cred.CredentialBlobSize = $bytes.Length
  $cred.CredentialBlob = $blob
  $cred.Persist = 2
  if (-not [CredMan]::CredWrite([ref]$cred, 0)) {
    throw [ComponentModel.Win32Exception][Runtime.InteropServices.Marshal]::GetLastWin32Error()
  }
} finally {
  if ($blob -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::FreeCoTaskMem($blob) }
}
`;
    await this.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      env: createSecretEnv({
        CMIS_PORTABLE_CREDENTIAL_ID: credential.credentialId,
        CMIS_PORTABLE_USERNAME: credential.username,
        CMIS_PORTABLE_SECRET: credential.secret
      })
    });
  }

  async getWindowsCredential(credentialId) {
    const script = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CredMan {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags;
    public UInt32 Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }
  [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, UInt32 type, UInt32 reservedFlag, out IntPtr credentialPtr);
  [DllImport("Advapi32.dll", EntryPoint="CredFree", SetLastError=true)]
  public static extern bool CredFree([In] IntPtr cred);
}
"@
$ptr = [IntPtr]::Zero
if (-not [CredMan]::CredRead($env:CMIS_PORTABLE_CREDENTIAL_ID, 1, 0, [ref]$ptr)) { exit 2 }
try {
  $cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan+CREDENTIAL])
  $secret = [Runtime.InteropServices.Marshal]::PtrToStringUni($cred.CredentialBlob, $cred.CredentialBlobSize / 2)
  [Console]::Out.Write(($cred.UserName + [Environment]::NewLine + $secret))
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [CredMan]::CredFree($ptr) | Out-Null }
}
`;
    try {
      const { stdout } = await this.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        env: createSecretEnv({ CMIS_PORTABLE_CREDENTIAL_ID: credentialId })
      });
      return parseCredentialOutput(credentialId, stdout);
    } catch (error) {
      if (error.code === 2) {
        return null;
      }
      throw error;
    }
  }

  async deleteWindowsCredential(credentialId) {
    const script = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CredMan {
  [DllImport("Advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredDelete(string target, UInt32 type, UInt32 flags);
}
"@
if (-not [CredMan]::CredDelete($env:CMIS_PORTABLE_CREDENTIAL_ID, 1, 0)) { exit 2 }
`;
    try {
      await this.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        env: createSecretEnv({ CMIS_PORTABLE_CREDENTIAL_ID: credentialId })
      });
      return true;
    } catch (error) {
      if (error.code === 2) {
        return false;
      }
      throw error;
    }
  }

  async saveMacOsCredential(credential) {
    await this.execFile('security', [
      'add-generic-password',
      '-a', credential.username,
      '-s', credential.credentialId,
      '-w', credential.secret,
      '-U'
    ]);
  }

  async getMacOsCredential(credentialId) {
    try {
      const [{ stdout: usernameOutput }, { stdout: secretOutput }] = await Promise.all([
        this.execFile('security', ['find-generic-password', '-s', credentialId]),
        this.execFile('security', ['find-generic-password', '-s', credentialId, '-w'])
      ]);

      return {
        credentialId,
        username: parseMacOsAccount(usernameOutput),
        secret: trimTrailingNewline(secretOutput)
      };
    } catch (error) {
      if (error.code === 44) {
        return null;
      }
      throw error;
    }
  }

  async deleteMacOsCredential(credentialId) {
    try {
      await this.execFile('security', ['delete-generic-password', '-s', credentialId]);
      return true;
    } catch (error) {
      if (error.code === 44) {
        return false;
      }
      throw error;
    }
  }

  async saveLinuxCredential(credential) {
    await this.execFile('secret-tool', [
      'store',
      '--label', `${this.serviceName} ${credential.username}`,
      'application', this.serviceName,
      'credentialId', credential.credentialId
    ], {
      input: JSON.stringify({
        username: credential.username,
        secret: credential.secret,
        kind: credential.kind
      })
    });
  }

  async getLinuxCredential(credentialId) {
    try {
      const { stdout } = await this.execFile('secret-tool', [
        'lookup',
        'application', this.serviceName,
        'credentialId', credentialId
      ]);
      return parseLinuxCredential(credentialId, stdout);
    } catch (error) {
      if (error.code === 1) {
        return null;
      }
      throw error;
    }
  }

  async deleteLinuxCredential(credentialId) {
    try {
      await this.execFile('secret-tool', [
        'clear',
        'application', this.serviceName,
        'credentialId', credentialId
      ]);
      return true;
    } catch (error) {
      if (error.code === 1) {
        return false;
      }
      throw error;
    }
  }
}

function runExecFile(file, args = [], options = {}) {
  const { input, ...execOptions } = options;
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, execOptions, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });

    if (input != null) {
      child.stdin.end(input);
    }
  });
}

function createCredentialId({ cmisUrl, username }) {
  const hash = crypto
    .createHash('sha256')
    .update(`${String(cmisUrl ?? '').trim()}\0${String(username ?? '').trim()}`)
    .digest('hex')
    .slice(0, 32);
  return `${SERVICE_NAME}:${hash}`;
}

function normalizeCredential(credential = {}) {
  const credentialId = normalizeCredentialId(credential.credentialId);
  const username = String(credential.username ?? '').trim();
  const secret = String(credential.secret ?? '');

  if (!username) {
    throw new Error('username is required');
  }

  if (!secret) {
    throw new Error('secret is required');
  }

  return {
    credentialId,
    username,
    secret,
    kind: String(credential.kind ?? 'password')
  };
}

function normalizeCredentialId(credentialId) {
  const id = String(credentialId ?? '').trim();
  if (!id) {
    throw new Error('credentialId is required');
  }
  return id;
}

function createCredentialMetadata(credentialId, platform = process.platform, kind = 'password') {
  return {
    kind,
    credentialId,
    storage: getPlatformStorageName(platform)
  };
}

function getPlatformStorageName(platform = process.platform) {
  if (platform === 'win32') {
    return 'windows-credential-manager';
  }

  if (platform === 'darwin') {
    return 'macos-keychain';
  }

  return 'linux-secret-service';
}

function parseCredentialOutput(credentialId, output) {
  const [username = '', ...secretLines] = String(output ?? '').split(/\r?\n/);
  return {
    credentialId,
    username,
    secret: trimTrailingNewline(secretLines.join(os.EOL))
  };
}

function parseLinuxCredential(credentialId, output) {
  const value = trimTrailingNewline(output);
  try {
    const parsed = JSON.parse(value);
    return {
      credentialId,
      username: String(parsed.username ?? ''),
      secret: String(parsed.secret ?? '')
    };
  } catch {
    return {
      credentialId,
      username: '',
      secret: value
    };
  }
}

function parseMacOsAccount(output) {
  const accountLine = String(output ?? '').split(/\r?\n/).find((line) => line.trim().startsWith('"acct"'));
  const match = accountLine?.match(/="(.*)"$/);
  return match?.[1] ?? '';
}

function trimTrailingNewline(value) {
  return String(value ?? '').replace(/[\r\n]+$/, '');
}

function createSecretEnv(values) {
  return {
    ...process.env,
    ...values
  };
}

module.exports = {
  ICredentialStore,
  PlatformCredentialStore,
  SERVICE_NAME,
  createCredentialId,
  createCredentialMetadata,
  getPlatformStorageName
};
