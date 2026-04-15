export interface Candidate {
  id: string;
  name: string;
  position: string;
  manifesto?: string;
  imageUrl: string;
  imagePath?: string;
  votes: number;
  createdAt: number;
}

export interface VoterRecord {
  lastVoteTime: number;
  lastVotedCandidateId: string;
}

export interface SystemSettings {
  votingOpen: boolean;
  resultsVisible: boolean;
  cooldownHours: number;
}
