const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

class PowerShellExecutor {
  constructor(scriptsPath = '../') {
    this.scriptsPath = scriptsPath;
    this.platform = process.platform;
  }

  /**
   * Execute a PowerShell script
   * @param {string} scriptName - Name of the PowerShell script
   * @param {Object} params - Parameters to pass to the script
   * @returns {Promise<Object>} - Parsed output or error
   */
  async execute(scriptName, params = {}) {
    try {
      const scriptPath = path.join(this.scriptsPath, scriptName);
      const command = this.buildCommand(scriptPath, params);
      
      console.log(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stderr && !stderr.includes('WARNING')) {
        console.warn('PowerShell stderr:', stderr);
      }

      return {
        success: true,
        output: stdout,
        error: null
      };
    } catch (error) {
      console.error(`PowerShell execution error:`, error);
      return {
        success: false,
        output: null,
        error: error.message
      };
    }
  }

  /**
   * Build PowerShell command with parameters
   * @param {string} scriptPath - Path to the script
   * @param {Object} params - Parameters object
   * @returns {string} - Complete command string
   */
  buildCommand(scriptPath, params) {
    const isWindows = this.platform === 'win32';
    const psCommand = isWindows ? 'powershell.exe' : 'pwsh';
    
    let paramString = '';
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        // Handle different parameter types
        if (typeof value === 'boolean') {
          if (value) paramString += ` -${key}`;
        } else if (typeof value === 'string') {
          paramString += ` -${key} "${value}"`;
        } else {
          paramString += ` -${key} ${value}`;
        }
      }
    }

    return `${psCommand} -ExecutionPolicy Bypass -File "${scriptPath}"${paramString}`;
  }

  /**
   * Read a JSON output file from PowerShell scripts
   * @param {string} filePath - Path to JSON file
   * @returns {Promise<Object>} - Parsed JSON data
   */
  async readJsonOutput(filePath) {
    const fs = require('fs').promises;
    try {
      const fullPath = path.join(this.scriptsPath, filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if PowerShell is available
   * @returns {Promise<boolean>}
   */
  async checkPowerShell() {
    try {
      const isWindows = this.platform === 'win32';
      const psCommand = isWindows ? 'powershell.exe' : 'pwsh';
      await execAsync(`${psCommand} -Command "echo 'test'"`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = PowerShellExecutor;
