from functools import lru_cache

import jwt
from flask import current_app


def get_keycloak_config():
    issuer = (current_app.config.get('KEYCLOAK_ISSUER_URL') or '').rstrip('/')
    client_id = current_app.config.get('KEYCLOAK_CLIENT_ID')

    if not issuer or not client_id:
        return None

    return {
        'issuer': issuer,
        'client_id': client_id,
        'jwks_uri': f'{issuer}/protocol/openid-connect/certs',
    }


@lru_cache(maxsize=4)
def get_jwk_client(jwks_uri):
    return jwt.PyJWKClient(jwks_uri)


def is_keycloak_enabled():
    return bool(get_keycloak_config())


def verify_keycloak_id_token(id_token):
    config = get_keycloak_config()

    if not config:
        raise RuntimeError('Keycloak login is not configured')

    signing_key = get_jwk_client(config['jwks_uri']).get_signing_key_from_jwt(id_token)

    return jwt.decode(
        id_token,
        signing_key.key,
        algorithms=['RS256', 'RS384', 'RS512'],
        audience=config['client_id'],
        issuer=config['issuer'],
    )