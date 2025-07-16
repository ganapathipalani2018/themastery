import * as sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/helpers/classes/mail';
import logger from '../config/logger';
import { config } from '../config/environment';

// Email service interfaces
export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
  trackingSettings?: {
    clickTracking?: boolean;
    openTracking?: boolean;
    subscriptionTracking?: boolean;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailQueueItem {
  id: string;
  email: EmailOptions;
  attempts: number;
  maxAttempts: number;
  nextRetry?: Date;
  createdAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'retry';
}

export class EmailService {
  private static instance: EmailService;
  private readonly defaultSender: string;
  private emailQueue: EmailQueueItem[] = [];
  private isProcessingQueue = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 60000; // 1 minute

  private constructor() {
    // Initialize SendGrid
    const apiKey = config.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.warn('SendGrid API key not configured. Email functionality will be disabled.');
    } else {
      sgMail.setApiKey(apiKey);
    }
    
    this.defaultSender = config.DEFAULT_EMAIL_SENDER || 'noreply@resumebuilder.com';
    
    // Start queue processing
    this.startQueueProcessor();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send email immediately (bypass queue)
   */
  public async sendEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
    if (!config.SENDGRID_API_KEY) {
      logger.warn('SendGrid API key not configured. Email not sent.', { to: options.to });
      return { success: false, error: 'Email service not configured' };
    }

    const msg: MailDataRequired = {
      to: options.to,
      from: options.from || this.defaultSender,
      subject: options.subject,
      text: options.text,
      html: options.html,
      trackingSettings: {
        clickTracking: {
          enable: options.trackingSettings?.clickTracking ?? true,
          enableText: false
        },
        openTracking: {
          enable: options.trackingSettings?.openTracking ?? true,
          substitutionTag: '%opentrackingpixel%'
        },
        subscriptionTracking: {
          enable: options.trackingSettings?.subscriptionTracking ?? false
        }
      }
    };

    try {
      const response = await sgMail.send(msg);
      const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';
      
      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId
      });
      
      return { success: true, messageId };
    } catch (error: any) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error.message,
        statusCode: error.code
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Queue email for reliable delivery
   */
  public queueEmail(options: EmailOptions): Promise<string> {
    const queueItem: EmailQueueItem = {
      id: this.generateQueueId(),
      email: options,
      attempts: 0,
      maxAttempts: this.maxRetries,
      createdAt: new Date(),
      status: 'pending'
    };

    this.emailQueue.push(queueItem);
    
    logger.info('Email queued', {
      queueId: queueItem.id,
      to: options.to,
      subject: options.subject
    });

    return Promise.resolve(queueItem.id);
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): {
    totalItems: number;
    pendingItems: number;
    failedItems: number;
    isProcessing: boolean;
  } {
    return {
      totalItems: this.emailQueue.length,
      pendingItems: this.emailQueue.filter(item => item.status === 'pending' || item.status === 'retry').length,
      failedItems: this.emailQueue.filter(item => item.status === 'failed').length,
      isProcessing: this.isProcessingQueue
    };
  }

  /**
   * Send verification email
   */
  public sendVerificationEmail(to: string, token: string): Promise<EmailDeliveryResult> {
    const verificationUrl = `${config.FRONTEND_URL}/verify?token=${token}`;
    const template = this.getVerificationEmailTemplate(verificationUrl);

    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send password reset email
   */
  public sendPasswordResetEmail(to: string, token: string): Promise<EmailDeliveryResult> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    const template = this.getPasswordResetEmailTemplate(resetUrl);

    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send security notification email
   */
  public sendSecurityNotificationEmail(
    to: string, 
    event: string, 
    details: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EmailDeliveryResult> {
    const template = this.getSecurityNotificationTemplate(event, details, ipAddress, userAgent);

    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send welcome email
   */
  public sendWelcomeEmail(to: string, firstName: string): Promise<EmailDeliveryResult> {
    const template = this.getWelcomeEmailTemplate(firstName);

    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send email verification success notification
   */
  public sendEmailVerifiedNotification(to: string, firstName: string): Promise<EmailDeliveryResult> {
    const template = this.getEmailVerifiedTemplate(firstName);

    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send password changed notification
   */
  public sendPasswordChangedNotification(to: string, firstName: string): Promise<EmailDeliveryResult> {
    const template = this.getPasswordChangedTemplate(firstName);

    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  // Private methods for email templates

  private getVerificationEmailTemplate(verificationUrl: string): EmailTemplate {
    return {
      subject: 'Verify Your Resume Builder Account',
      text: `Welcome to Resume Builder! Please verify your account by clicking this link: ${verificationUrl}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; text-align: center; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Resume Builder!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Account</h2>
              <p>Thank you for signing up for Resume Builder. To complete your registration, please verify your email address by clicking the button below:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">Verify Account</a>
              </p>
              <p>If the button doesn't work, you can also click this link:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>This verification link will expire in 24 hours for security purposes.</p>
            </div>
            <div class="footer">
              <p>If you didn't create an account with Resume Builder, please ignore this email.</p>
              <p>&copy; 2024 Resume Builder. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getPasswordResetEmailTemplate(resetUrl: string): EmailTemplate {
    return {
      subject: 'Reset Your Resume Builder Password',
      text: `You requested a password reset. Please click this link to reset your password: ${resetUrl}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; background-color: #2196F3; color: white; padding: 14px 28px; text-align: center; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>You requested a password reset for your Resume Builder account. Click the button below to reset your password:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>If the button doesn't work, you can also click this link:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <div class="warning">
                <strong>Important:</strong> This password reset link will expire in 1 hour for security purposes. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
              </div>
            </div>
            <div class="footer">
              <p>If you didn't request a password reset, please ignore this email.</p>
              <p>&copy; 2024 Resume Builder. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getSecurityNotificationTemplate(event: string, details: string, ipAddress?: string, userAgent?: string): EmailTemplate {
    return {
      subject: `Security Alert: ${event}`,
      text: `We detected a security event on your account: ${event}. Details: ${details}. If this wasn't you, please secure your account immediately.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Security Alert</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .alert { background-color: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f44336; }
            .details { background-color: #fff; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Security Alert</h1>
            </div>
            <div class="content">
              <div class="alert">
                <h2>Security Event Detected</h2>
                <p><strong>Event:</strong> ${event}</p>
                <p><strong>Details:</strong> ${details}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              ${ipAddress || userAgent ? `
                <div class="details">
                  <h3>Connection Details:</h3>
                  ${ipAddress ? `<p><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
                  ${userAgent ? `<p><strong>Device/Browser:</strong> ${userAgent}</p>` : ''}
                </div>
              ` : ''}
              
              <h3>What should you do?</h3>
              <ul>
                <li>If this was you, no action is needed</li>
                <li>If this wasn't you, please secure your account by changing your password immediately</li>
                <li>Review your account activity for any unauthorized access</li>
                <li>Contact support if you have concerns</li>
              </ul>
            </div>
            <div class="footer">
              <p>This is an automated security notification from Resume Builder.</p>
              <p>&copy; 2024 Resume Builder. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getWelcomeEmailTemplate(firstName: string): EmailTemplate {
    return {
      subject: 'Welcome to Resume Builder!',
      text: `Hi ${firstName}, welcome to Resume Builder! We're excited to help you create professional resumes that stand out.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Resume Builder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; text-align: center; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .feature { background-color: #fff; padding: 15px; margin: 10px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Resume Builder, ${firstName}!</h1>
            </div>
            <div class="content">
              <h2>You're all set! 🎉</h2>
              <p>Thank you for verifying your email address. Your Resume Builder account is now active and ready to use.</p>
              
              <h3>What's next?</h3>
              <div class="feature">
                <h4>📝 Create Your First Resume</h4>
                <p>Start building your professional resume with our easy-to-use templates</p>
              </div>
              <div class="feature">
                <h4>🎨 Choose from Templates</h4>
                <p>Select from our collection of professional resume templates</p>
              </div>
              <div class="feature">
                <h4>📤 Export & Share</h4>
                <p>Download your resume as PDF or share it with a custom link</p>
              </div>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${config.FRONTEND_URL}/dashboard" class="button">Get Started</a>
              </p>
            </div>
            <div class="footer">
              <p>Need help? Visit our support center or contact us anytime.</p>
              <p>&copy; 2024 Resume Builder. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getEmailVerifiedTemplate(firstName: string): EmailTemplate {
    return {
      subject: 'Email Verified Successfully!',
      text: `Hi ${firstName}, your email has been verified successfully! Your Resume Builder account is now fully activated.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; text-align: center; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .success { background-color: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Verified!</h1>
            </div>
            <div class="content">
              <div class="success">
                <h2>Great news, ${firstName}!</h2>
                <p>Your email has been verified successfully. Your Resume Builder account is now fully activated.</p>
              </div>
              
              <p>You can now access all features of Resume Builder:</p>
              <ul>
                <li>Create unlimited resumes</li>
                <li>Use all professional templates</li>
                <li>Export to PDF format</li>
                <li>Share resumes with custom links</li>
              </ul>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${config.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>Thank you for choosing Resume Builder!</p>
              <p>&copy; 2024 Resume Builder. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getPasswordChangedTemplate(firstName: string): EmailTemplate {
    return {
      subject: 'Password Changed Successfully',
      text: `Hi ${firstName}, your Resume Builder password has been changed successfully. If you didn't make this change, please contact support immediately.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .success { background-color: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .warning { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Password Changed</h1>
            </div>
            <div class="content">
              <div class="success">
                <h2>Hi ${firstName},</h2>
                <p>Your Resume Builder password has been changed successfully.</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div class="warning">
                <h3>⚠️ Didn't make this change?</h3>
                <p>If you didn't change your password, please contact our support team immediately to secure your account.</p>
              </div>
              
              <h3>Security Tips:</h3>
              <ul>
                <li>Keep your password secure and don't share it with anyone</li>
                <li>Use a unique password for your Resume Builder account</li>
                <li>Enable browser password saving for convenience</li>
                <li>Contact support if you notice any suspicious activity</li>
              </ul>
            </div>
            <div class="footer">
              <p>This is an automated security notification from Resume Builder.</p>
              <p>&copy; 2024 Resume Builder. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  // Queue processing methods

  private startQueueProcessor(): void {
    // eslint-disable-next-line no-undef
    setInterval(() => {
      this.processQueue();
    }, 30000); // Process every 30 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const pendingItems = this.emailQueue.filter(item => 
        item.status === 'pending' || 
        (item.status === 'retry' && item.nextRetry && item.nextRetry <= new Date())
      );

      for (const item of pendingItems) {
        await this.processQueueItem(item);
      }

      // Clean up old completed items (older than 24 hours)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.emailQueue = this.emailQueue.filter(item => 
        item.status === 'pending' || 
        item.status === 'retry' || 
        item.createdAt > cutoffTime
      );

    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processQueueItem(item: EmailQueueItem): Promise<void> {
    item.attempts++;

    try {
      const result = await this.sendEmail(item.email);
      
      if (result.success) {
        item.status = 'sent';
        logger.info('Queued email sent successfully', {
          queueId: item.id,
          to: item.email.to,
          attempts: item.attempts
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      logger.error('Failed to process queued email', {
        queueId: item.id,
        to: item.email.to,
        attempts: item.attempts,
        error: error.message
      });

      if (item.attempts >= item.maxAttempts) {
        item.status = 'failed';
      } else {
        item.status = 'retry';
        item.nextRetry = new Date(Date.now() + this.retryDelay * item.attempts);
      }
    }
  }

  private generateQueueId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export default EmailService.getInstance(); 