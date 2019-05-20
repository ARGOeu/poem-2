from django.core.cache import cache

from djangosaml2.backends import Saml2Backend
from django.contrib.auth import get_user_model

from unidecode import unidecode

from Poem.poem.models import UserProfile, Saml2LoginCache


class SAML2Backend(Saml2Backend):
    def username_from_displayname(self, displayname):
        ascii_displayname = unidecode(displayname)

        if ' ' in ascii_displayname:
            name = ascii_displayname.split(' ')
            return '_'.join(name)
        else:
            return ascii_displayname

    def username_from_givename_sn(self, firstname, lastname):
        ascii_firstname = unidecode(firstname)
        ascii_lastname = unidecode(lastname)

        if ' ' in ascii_firstname:
            ascii_firstname = '_'.join(ascii_firstname.split(' '))

        if ' ' in ascii_lastname:
            ascii_lastname = '_'.join(ascii_lastname.split(' '))

        return ascii_firstname + '_' + ascii_lastname

    def certsub_rev(self, certsubject, retlist=False):
        attrs = certsubject.split('/')
        attrs.reverse()

        if retlist:
            return attrs[:-1]
        else:
            return ','.join(attrs[:-1])

    def joinval(self, attr):
        if len(attr) > 1:
            return ' '.join(attr)
        elif len(attr) == 1:
            return attr[0]

    def extractby_keyoid(self, attr, attrs):
        NAME_TO_OID = {'distinguishedName': 'urn:oid:2.5.4.49',
                       'eduPersonUniqueId': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.13'}
        if attr in attrs:
            return attrs[attr]
        else:
            return attrs[NAME_TO_OID[attr]]

    def authenticate(self, session_info=None, attribute_mapping=None,
                     create_unknown_user=True):
        attributes = session_info['ava']

        displayname, username, first_name, last_name = '', '', '', ''
        try:
            displayname = self.joinval(attributes['displayName'])
            username = self.username_from_displayname(displayname)
            first_name, last_name = displayname.split(' ', 1)
        except KeyError:
            first_name = self.joinval(attributes['givenName'])
            last_name = self.joinval(attributes['sn'])
            username = self.username_from_givename_sn(first_name, last_name)

        certsub = ''
        try:
            certsub = self.joinval(self.extractby_keyoid('distinguishedName',
                                                         attributes))
            certsub = self.certsub_rev(certsub)
        except (KeyError, IndexError):
            pass

        email, egiid = '', ''
        try:
            email = self.joinval(attributes['mail'])
            egiid = self.joinval(self.extractby_keyoid('eduPersonUniqueId',
                                                       attributes))
        except KeyError:
            pass

        userfound, created = None, None
        try:
            userfound = get_user_model().objects.get(username=username)
        except get_user_model().DoesNotExist:
            user, created = get_user_model().objects.get_or_create(username=username,
                                                                   first_name=first_name,
                                                                   last_name=last_name,
                                                                   email=email)

        if created:
            user.set_unusable_password()
            user.is_active = True
            user.is_staff = True
            user.save()

            userpro, upcreated = UserProfile.objects.get_or_create(user=user)
            userpro.subject = certsub
            userpro.displayname = displayname
            userpro.egiid = egiid
            userpro.save()

            cache.set_many({'saml2username': user.username,
                            'saml2firstname': user.first_name,
                            'saml2lastname': user.last_name,
                            'saml2issuperuser': user.is_superuser})

            return user

        elif userfound:
            userfound.email = email
            userfound.first_name = first_name
            userfound.last_name = last_name
            userfound.save()

            userpro = UserProfile.objects.get(user=userfound)
            userpro.displayname = displayname
            userpro.egiid = egiid
            userpro.subject = certsub
            userpro.save()

            cache.set_many({'saml2_username': userfound.username,
                            'saml2_first_name': userfound.first_name,
                            'saml2_last_name': userfound.last_name,
                            'saml2_is_superuser': userfound.is_superuser})

            return userfound

        else:
            return None
