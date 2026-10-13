"""Envio de e-mail transacional por SMTP (funciona com Gmail, Resend, SES, Brevo...).

Sem SMTP_HOST configurado, nada é enviado: o conteúdo (com o link) vai para o log,
o que basta para testar confirmação de e-mail e recuperação de senha em desenvolvimento.
"""
import smtplib
import ssl
from email.message import EmailMessage

from backend.core.config import settings
from backend.core.logger import logger


def email_enabled() -> bool:
    return bool(settings.SMTP_HOST)


def send_email(to: str, subject: str, text: str, html: str | None = None,
               attachments: list[tuple[str, bytes, str]] | None = None, reply_to: str | None = None) -> bool:
    """attachments: [(nome_do_arquivo, conteúdo, "tipo/subtipo")]."""
    if not email_enabled():
        logger.warning(f"[email não configurado] Para: {to} | Assunto: {subject}\n{text}")
        return False

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if reply_to:
        msg["Reply-To"] = reply_to
    if html:
        msg.add_alternative(html, subtype="html")
    for filename, content, mime in attachments or []:
        maintype, subtype = mime.split("/", 1)
        msg.add_attachment(content, maintype=maintype, subtype=subtype, filename=filename)

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ssl.create_default_context(), timeout=15)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            if settings.SMTP_STARTTLS:
                server.starttls(context=ssl.create_default_context())
        with server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            server.send_message(msg)
        return True
    except Exception as e:
        # Falha de e-mail não derruba o fluxo (cadastro, "esqueci a senha"): fica no log.
        logger.error(f"Falha ao enviar e-mail para {to}: {e}")
        return False


def _layout(title: str, body: str, button_label: str, url: str) -> str:
    return f"""<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2933">
<h2 style="color:#0a4174">{title}</h2>
<p>{body}</p>
<p><a href="{url}" style="display:inline-block;background:#0a4174;color:#fff;padding:12px 20px;text-decoration:none;border-radius:2px">{button_label}</a></p>
<p style="font-size:12px;color:#6b7280">Se o botão não funcionar, copie e cole no navegador:<br>{url}</p>
<p style="font-size:12px;color:#6b7280">MyTeacherApp</p></div>"""


def send_verification_email(to: str, url: str) -> bool:
    body = "Confirme seu e-mail para garantir o acesso à sua conta e poder recuperar a senha. O link vale por 48 horas."
    return send_email(
        to, "Confirme seu e-mail no MyTeacherApp",
        f"{body}\n\n{url}",
        _layout("Confirme seu e-mail", body, "Confirmar e-mail", url),
    )


def send_password_reset_email(to: str, url: str) -> bool:
    body = "Recebemos um pedido para redefinir a senha da sua conta. O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail."
    return send_email(
        to, "Redefinir sua senha no MyTeacherApp",
        f"{body}\n\n{url}",
        _layout("Redefinir senha", body, "Criar nova senha", url),
    )


DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def send_monthly_report_email(to: str, summary: dict, docx: bytes, filename: str, reply_to: str | None = None) -> bool:
    """Resumo do mês para os pais, com o relatório em Word anexo. Responder vai para o professor/escola."""
    return send_email(to, summary["subject"], summary["text"], summary["html"],
                      attachments=[(filename, docx, DOCX_MIME)], reply_to=reply_to)
