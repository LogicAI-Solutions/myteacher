"""Cadastro público: invariantes de segurança que não podem regredir."""
import sys, os
sys.path.append(os.getcwd())

import pytest
from pydantic import ValidationError
from backend.schemas.users import UserRegister


def test_apelido_nao_pode_parecer_email():
    """O login resolve por apelido OU email (crud.get_user_by_nickname). Se um
    apelido pudesse conter '@', daria para registrar um que se passa pelo email
    de outra pessoa e criar credencial ambígua."""
    with pytest.raises(ValidationError):
        UserRegister(
            full_name="Impostor Silva",
            email="i@x.com",
            nickname="admin@admin.com",
            password="senha12345",
        )


def test_senha_curta_recusada():
    with pytest.raises(ValidationError):
        UserRegister(full_name="Ana Souza", email="ana@x.com", nickname="ana", password="1234")


def test_email_invalido_recusado():
    with pytest.raises(ValidationError):
        UserRegister(full_name="Ana Souza", email="nao-e-email", nickname="ana", password="senha12345")


def test_normaliza_email_e_nome():
    user = UserRegister(
        full_name="  Maria   Silva ",
        email="Maria@Escola.com.BR",
        nickname="maria.silva",
        password="senha12345",
    )
    assert user.email == "maria@escola.com.br"  # senão o duplicado passa variando maiúscula
    assert user.full_name == "Maria Silva"


def test_payload_nao_carrega_privilegio():
    """is_admin/is_trial não existem no schema público: mesmo que o cliente mande,
    pydantic descarta e o router força is_trial=True."""
    user = UserRegister(
        full_name="Hacker Silva",
        email="h@x.com",
        nickname="hacker",
        password="senha12345",
        is_admin=True,
    )
    assert not hasattr(user, "is_admin")


if __name__ == "__main__":
    test_normaliza_email_e_nome()
    test_payload_nao_carrega_privilegio()
    print("ok")
