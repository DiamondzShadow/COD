const PowerShellExecutor = require('./powershell-executor');
const fs = require('fs').promises;
const path = require('path');

class AuthService {
  constructor(scriptsPath) {
    this.executor = new PowerShellExecutor(scriptsPath);
    this.scriptsPath = scriptsPath;
    this.loginDataPath = path.join(scriptsPath, 'login_data.json');
  }

  /**
   * Login to Activision account
   * @param {string} username - Activision email/username
   * @param {string} password - Activision password
   * @returns {Promise<Object>} - Login response
   */
  async login(username, password) {
    try {
      // Create secure string for password (PowerShell specific)
      const result = await this.executor.execute('cod_login.ps1', {
        Username: username,
        Password: password // Note: This is simplified, production needs secure handling
      });

      if (result.success) {
        // Verify login_data.json was created
        const loginData = await this.getLoginData();
        return {
          success: true,
          data: loginData,
          message: 'Successfully authenticated with Activision'
        };
      }

      return {
        success: false,
        error: result.error,
        message: 'Authentication failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Authentication error'
      };
    }
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    try {
      await fs.access(this.loginDataPath);
      const loginData = await this.getLoginData();
      return loginData && loginData.auth_header && loginData.device_id;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stored login data
   * @returns {Promise<Object|null>}
   */
  async getLoginData() {
    try {
      const data = await fs.readFile(this.loginDataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Build SSO web session
   * @returns {Promise<Object>}
   */
  async buildSession() {
    const result = await this.executor.execute('build_sso_websession.ps1', {
      SaveFile: 'login_data.json',
      CookieDomain: 'my.callofduty.com'
    });

    return result;
  }

  /**
   * Logout / clear session
   * @returns {Promise<boolean>}
   */
  async logout() {
    try {
      await fs.unlink(this.loginDataPath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = AuthService;
