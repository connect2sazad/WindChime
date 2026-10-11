import nodemailer from 'nodemailer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import errors from '../errors/registry.js';
import config from '../config/config.js';
const OUTBOX = fileURLToPath(new URL('../.mail-outbox/', import.meta.url));

async function sendMessage(email, subject, text, id) {
    const mode = process.env.MAIL_TRANSPORT || 'smtp';
    if (mode === 'outbox') {
        if (process.env.NODE_ENV==='production' || !['development','test'].includes(config.ENVIRONMENT)) throw new errors.ServiceUnavailableException('Development outbox is disabled in this environment');
        await fs.mkdir(OUTBOX,{recursive:true});
        await fs.writeFile(path.join(OUTBOX,`${id}.eml`),`To: ${email}\nSubject: ${subject}\n\n${text}`,{mode:0o600});
        return { delivery:'outbox' };
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw new errors.ServiceUnavailableException('Email delivery is not configured');
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
    const transport = nodemailer.createTransport({
        requireTLS:!secure,host:process.env.SMTP_HOST || 'smtp.gmail.com',port,secure,
        auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},
        connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,dnsTimeout:5000,
        disableFileAccess:true,disableUrlAccess:true,
    });
    try {
        const info=await transport.sendMail({from:process.env.MAIL_FROM || process.env.SMTP_USER,to:email,subject,text});
        if (!info.accepted?.length) throw new Error('Email not accepted');
        return { delivery:'smtp' };
    } catch { throw new errors.ServiceUnavailableException('Could not deliver verification email. Please retry later'); }
}
async function sendVerification(email, code, id) {
    const text = `Your WindChime verification code is ${code}.\n\nIt expires in 10 minutes. If you did not request this, ignore this message.`;
    return sendMessage(email, 'Verify your WindChime account', text, id);
}

async function sendPasswordReset(email, code, id) {
    const text = `Your WindChime password recovery code is ${code}.\n\nIt expires in 10 minutes. If you did not request this, ignore this message.`;
    return sendMessage(email, 'Reset your WindChime password', text, id);
}

export default { sendVerification, sendPasswordReset };
