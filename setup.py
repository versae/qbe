import codecs
import re
from os import path
from setuptools import setup, find_packages


def read(*parts):
    file_path = path.join(path.dirname(__file__), *parts)
    return codecs.open(file_path).read()


def find_version(*parts):
    version_file = read(*parts)
    version_match = re.search(r"^__version__ = ['\"]([^'\"]*)['\"]",
                              version_file, re.M)
    if version_match:
        return version_match.group(1)
    raise RuntimeError("Unable to find version string.")

setup(
    name='django_qbe',
    version=find_version('django_qbe', '__init__.py'),
    author='Javier de la Rosa',
    author_email='versae@gmail.com',
    url='http://versae.github.com/qbe/',
    description='Django admin tool for custom reports',
    long_description=read('README.rst'),
    license='MIT',
    keywords='qbe django admin reports query sql',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: JavaScript',
        'Programming Language :: Python',
        'Topic :: Internet :: WWW/HTTP',
        ],
    zip_safe=False,
    packages=find_packages(),
    include_package_data=True,
    install_requires=['django-picklefield'],
)
