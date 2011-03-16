import os

from setuptools import setup, find_packages


def read(*rnames):
    return open(os.path.join(os.path.dirname(__file__), *rnames)).read()


setup(
    name='django_qbe',
    version='0.1.4',
    author='Javier de la Rosa',
    author_email='versae@gmail.com',
    url='http://versae.github.com/qbe/',
    description='Django admin tool for custom reports',
    long_description=read('README.txt'),
    license='AGPL 3',
    keywords='qbe django admin reports query sql',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU Affero General Public License v3',
        'Operating System :: OS Independent',
        'Programming Language :: JavaScript',
        'Programming Language :: Python',
        'Topic :: Internet :: WWW/HTTP',
        ],
    zip_safe=False,
    packages=find_packages(),
    )
