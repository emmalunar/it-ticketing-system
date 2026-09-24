import os


def test_project_environment_variables_are_defined():
    assert os.getenv("DJANGO_SECRET_KEY") is not None
    assert os.getenv("POSTGRES_DB") is not None
    assert os.getenv("REDIS_URL") is not None
