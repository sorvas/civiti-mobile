import { Localization } from '@/constants/localization';
import type { IssueAuthorityResponse, IssueDetailResponse } from '@/types/issues';
import { formatDateRomanian } from '@/utils/format-date-romanian';

type BuildMailtoParams = {
  authority: IssueAuthorityResponse;
  issue: IssueDetailResponse;
};

export type EmailParts = {
  to: string;
  subject: string;
  body: string;
};

const { petition } = Localization.email;

/**
 * Build a legally-compliant petition email per Romanian OG 27/2002.
 * Contains placeholder brackets the user must fill in their email client.
 */
export function buildEmailParts({ authority, issue }: BuildMailtoParams): EmailParts {
  const to = authority.email ?? '';

  const subject = petition.subjectTemplate(issue.title ?? '');

  const locationParts = [issue.address];
  if (issue.district) locationParts.push(issue.district);
  const locationString =
    locationParts.filter(Boolean).join(', ') || petition.locationFallback;

  const createdDate = formatDateRomanian(issue.createdAt);
  const currentDate = formatDateRomanian(new Date().toISOString());

  const communityImpactSection = issue.communityImpact?.trim()
    ? `\n${issue.communityImpact.trim()}`
    : '';

  const desiredOutcomeText = issue.desiredOutcome?.trim()
    ? issue.desiredOutcome.trim()
    : petition.defaultDesiredOutcome;

  const photoCount = issue.photos?.length ?? 0;
  const photosSection =
    photoCount > 0 ? `${petition.photosAttachment(photoCount)}\n` : '';

  const authorityName = authority.name ?? petition.authorityFallback;

  const body = `${petition.salutation(authorityName)}

${petition.petitionerLine}

${issue.title ?? ''}

${petition.locationLabel} ${locationString}
${petition.dateLabel} ${createdDate}

${issue.description ?? ''}${communityImpactSection}

${desiredOutcomeText}

${photosSection}${petition.linkPrefix} https://civiti.ro/issues/${issue.id}

${petition.legalParagraph}

${petition.registrationRequest}

${petition.closing}
${petition.namePlaceholder}
${currentDate}`;

  return { to, subject, body };
}
