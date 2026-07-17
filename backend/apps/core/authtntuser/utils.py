from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

User = get_user_model()


def generate_uidb64_token(user):
    """
    Generates a uidb64 and token for email verification
    and password reset.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)

    return uid, token


def send_verification_email(user):
    """
    Sends account verification email.
    """

    uid, token = generate_uidb64_token(user)

    verification_token = f"{uid}.{token}"

    verification_url = (
        f"{settings.FRONTEND_URL}/verify-email/"
        f"?token={verification_token}"
    )

    subject = "Verify your account"

    html_message = render_to_string(
        "emails/verify_email.html",
        {
            "user": user,
            "verification_url": verification_url,
        },
    )

    send_mail(
        subject=subject,
        message="Please verify your account.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_password_reset_email(user):
    """
    Sends password reset email.
    """

    uid, token = generate_uidb64_token(user)

    reset_url = (
        f"{settings.FRONTEND_URL}/reset-password/"
        f"?uid={uid}&token={token}"
    )

    subject = "Reset your password"

    html_message = render_to_string(
        "emails/password_reset.html",
        {
            "user": user,
            "reset_url": reset_url,
        },
    )

    send_mail(
        subject=subject,
        message="Reset your password.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )