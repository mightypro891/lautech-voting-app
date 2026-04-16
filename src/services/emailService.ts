import emailjs from '@emailjs/browser';

// EmailJS configuration - You'll need to set these up in your EmailJS account
const EMAILJS_SERVICE_ID = 'service_7koqloz';
const EMAILJS_TEMPLATE_ID = 'your_template_id';
const EMAILJS_PUBLIC_KEY = 'Uyf55dcjX4VlhlMFE';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface EmailNotification {
  to_email: string;
  subject: string;
  message: string;
  candidate_name?: string;
  voter_count?: number;
  activity_type?: string;
}

export async function sendVoteNotification(candidateName: string, totalVotes: number) {
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: 'promiseoyedele06@gmail.com', // Replace with your admin email
        subject: 'New Vote Cast',
        message: `A new vote has been cast for ${candidateName}. Total votes: ${totalVotes}`,
        candidate_name: candidateName,
        voter_count: totalVotes,
        activity_type: 'vote'
      }
    );
    console.log('Vote notification sent successfully');
  } catch (error) {
    console.error('Failed to send vote notification:', error);
  }
}

export async function sendAdminActionNotification(action: string, details: string) {
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: 'promiseoyedele06@gmail.com', // Replace with your admin email
        subject: 'Admin Action Performed',
        message: `Admin action: ${action}. Details: ${details}`,
        activity_type: 'admin_action'
      }
    );
    console.log('Admin action notification sent successfully');
  } catch (error) {
    console.error('Failed to send admin action notification:', error);
  }
}

export async function sendSuspiciousActivityAlert(reason: string, voterId: string, candidateId?: string) {
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: 'promiseoyedele06@gmail.com', // Replace with your admin email
        subject: 'Suspicious Activity Detected',
        message: `Suspicious activity detected: ${reason}. Voter ID: ${voterId}${candidateId ? `. Candidate ID: ${candidateId}` : ''}`,
        activity_type: 'suspicious_activity'
      }
    );
    console.log('Suspicious activity alert sent successfully');
  } catch (error) {
    console.error('Failed to send suspicious activity alert:', error);
  }
}

export async function sendBulkVoteNotification(positionSummary: string, totalPositions: number) {
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: 'promiseoyedele06@gmail.com', // Replace with your admin email
        subject: 'Bulk Votes Cast',
        message: `Bulk votes cast for ${totalPositions} positions: ${positionSummary}`,
        activity_type: 'bulk_vote'
      }
    );
    console.log('Bulk vote notification sent successfully');
  } catch (error) {
    console.error('Failed to send bulk vote notification:', error);
  }
}

export async function sendSystemStatusNotification(status: string, details: string) {
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: 'promiseoyedele06@gmail.com', // Replace with your admin email
        subject: 'System Status Update',
        message: `System status: ${status}. ${details}`,
        activity_type: 'system_status'
      }
    );
    console.log('System status notification sent successfully');
  } catch (error) {
    console.error('Failed to send system status notification:', error);
  }
}

// Configuration helper
export function configureEmailJS(serviceId: string, templateId: string, publicKey: string) {
  // This would be called from your app initialization
  // You can set these in environment variables or a config file
  console.log('EmailJS configured with:', { serviceId, templateId, publicKey });
}