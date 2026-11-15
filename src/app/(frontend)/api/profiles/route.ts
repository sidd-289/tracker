const usernamePattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{0,37}[a-zA-Z0-9])?$/

type ContributionDay = {
  date: string
  count: number
  level: number
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const platform = url.searchParams.get('platform')
  const username = url.searchParams.get('username')?.trim() || ''

  if (!usernamePattern.test(username)) {
    return Response.json({ error: 'Enter a valid public username.' }, { status: 400 })
  }

  try {
    if (platform === 'github') {
      const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Jans-Personal-OS',
      }
      const [profileResponse, reposResponse, contributionsResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
          headers,
          cache: 'no-store',
        }),
        fetch(
          `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`,
          { headers, cache: 'no-store' },
        ),
        fetch(
          `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`,
          { cache: 'no-store' },
        ).catch(() => null),
      ])

      if (!profileResponse.ok) {
        return Response.json(
          {
            error:
              profileResponse.status === 404
                ? 'GitHub profile not found.'
                : 'GitHub could not be reached.',
          },
          { status: profileResponse.status === 404 ? 404 : 502 },
        )
      }

      const profile = await profileResponse.json()
      const repos = reposResponse.ok ? await reposResponse.json() : []
      let contributions: ContributionDay[] = []
      let totalContributions = 0

      if (contributionsResponse?.ok) {
        const contributionData = await contributionsResponse.json()
        contributions = Array.isArray(contributionData.contributions)
          ? contributionData.contributions.slice(-364).map((day: ContributionDay) => ({
              date: day.date,
              count: Number(day.count) || 0,
              level: Math.min(4, Math.max(0, Number(day.level) || 0)),
            }))
          : []
        totalContributions = Object.values(contributionData.total || {}).reduce(
          (sum: number, value) => sum + (Number(value) || 0),
          0,
        )
      }

      return Response.json({
        platform: 'github',
        username: profile.login,
        name: profile.name || profile.login,
        avatar: profile.avatar_url,
        bio: profile.bio || '',
        followers: profile.followers || 0,
        following: profile.following || 0,
        publicRepos: profile.public_repos || 0,
        profileUrl: profile.html_url,
        totalContributions,
        contributions,
        repos: Array.isArray(repos)
          ? repos.map((repo) => ({
              id: repo.id,
              name: repo.name,
              url: repo.html_url,
              description: repo.description || '',
              language: repo.language || 'Other',
              stars: repo.stargazers_count || 0,
            }))
          : [],
      })
    }

    if (platform === 'codeforces') {
      const response = await fetch(
        `https://codeforces.com/api/user.info?handles=${encodeURIComponent(username)}`,
        { cache: 'no-store' },
      )
      const data = await response.json()
      if (!response.ok || data.status !== 'OK') {
        return Response.json({ error: 'Codeforces profile not found.' }, { status: 404 })
      }
      const profile = data.result[0]
      return Response.json({
        platform: 'codeforces',
        username: profile.handle,
        rating: profile.rating || 0,
        maxRating: profile.maxRating || 0,
        rank: profile.rank || 'unrated',
        avatar: profile.titlePhoto || profile.avatar || '',
        profileUrl: `https://codeforces.com/profile/${encodeURIComponent(profile.handle)}`,
      })
    }

    if (platform === 'leetcode') {
      try {
        const query = `
          query getUserProfile($username: String!) {
            matchedUser(username: $username) {
              username
              profile {
                ranking
                userAvatar
              }
              submitStats: submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
            }
          }
        `
        const leetRes = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          },
          body: JSON.stringify({ query, variables: { username } }),
          cache: 'no-store',
          signal: AbortSignal.timeout(6000),
        })

        if (leetRes.ok) {
          const json = await leetRes.json()
          const user = json?.data?.matchedUser
          if (user) {
            const submissions = user.submitStats?.acSubmissionNum || []
            const totalSolved = submissions.find((s: any) => s.difficulty === 'All')?.count || 0
            const easy = submissions.find((s: any) => s.difficulty === 'Easy')?.count || 0
            const medium = submissions.find((s: any) => s.difficulty === 'Medium')?.count || 0
            const hard = submissions.find((s: any) => s.difficulty === 'Hard')?.count || 0

            return Response.json({
              platform: 'leetcode',
              username: user.username,
              ranking: user.profile?.ranking || 0,
              avatar: user.profile?.userAvatar || '',
              totalSolved,
              easy,
              medium,
              hard,
              profileUrl: `https://leetcode.com/u/${encodeURIComponent(user.username)}/`,
            })
          }
        }
      } catch {
        // Fallback to proxy if direct GraphQL is unreachable
      }

      // Secondary Fallback via Alfa API
      const [solvedResponse, profileResponse] = await Promise.all([
        fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/solved`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
      ])
      if (!solvedResponse.ok) {
        return Response.json({ error: 'LeetCode profile not found.' }, { status: 404 })
      }
      const solved = await solvedResponse.json()
      const profile = profileResponse?.ok ? await profileResponse.json() : {}
      return Response.json({
        platform: 'leetcode',
        username: profile.username || username,
        ranking: profile.ranking || 0,
        avatar: profile.avatar || '',
        totalSolved: solved.solvedProblem || 0,
        easy: solved.easySolved || 0,
        medium: solved.mediumSolved || 0,
        hard: solved.hardSolved || 0,
        profileUrl: `https://leetcode.com/u/${encodeURIComponent(profile.username || username)}/`,
      })
    }

    if (platform === 'codechef') {
      const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(username)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      })

      if (!res.ok) {
        return Response.json({ error: 'CodeChef profile not found.' }, { status: 404 })
      }

      const html = await res.text()
      const userExists =
        html.includes(`"currentUser":"${username}"`) || html.includes('user-details-container')
      if (!userExists) {
        return Response.json({ error: 'CodeChef handle not found.' }, { status: 404 })
      }

      const ratingMatch =
        html.match(/class="rating-number"[^>]*>\s*([0-9]+)\s*<\/div>/i) ||
        html.match(/"rating":\s*"([0-9]+)"/)
      const starCount = (html.match(/&#9733;|\u2605/g) || []).length
      const starsVal = starCount > 0 ? `${starCount}★` : '1★'
      const globalRankMatch = html.match(/global rank\s*([0-9]+)/i)
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0
      const ranking = globalRankMatch ? parseInt(globalRankMatch[1], 10) : 0

      return Response.json({
        platform: 'codechef',
        username,
        rating,
        rank: starsVal,
        ranking,
        avatar: '',
        profileUrl: `https://www.codechef.com/users/${encodeURIComponent(username)}`,
      })
    }

    return Response.json({ error: 'Unsupported platform.' }, { status: 400 })
  } catch {
    return Response.json(
      { error: 'The profile service is temporarily unavailable.' },
      { status: 502 },
    )
  }
}
