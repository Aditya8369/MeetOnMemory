const { getRsvpSummary } = require('../../controllers/meetingRsvpController');
const Meeting = require('../../models/Meeting');
const meetingRsvpService = require('../../services/meetingRsvpService');

// Mock external dependencies
jest.mock('../../models/Meeting');
jest.mock('../../services/meetingRsvpService');

describe('meetingRsvpController.getRsvpSummary', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { meetingId: 'meeting123' },
      user: {
        _id: 'user1',
        role: 'user',
        organization: 'orgABC'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('should retrieve RSVP summary for authorized same-organization users', async () => {
    Meeting.findById.mockResolvedValue({
      _id: 'meeting123',
      organization: 'orgABC'
    });
    const mockSummary = { total: 5, participants: [{ name: 'Test User' }] };
    meetingRsvpService.getSummary.mockResolvedValue(mockSummary);

    await getRsvpSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockSummary);
    expect(meetingRsvpService.getSummary).toHaveBeenCalledWith('meeting123');
  });

  it('should return 404 for cross-organization access to prevent IDOR and PII exposure', async () => {
    Meeting.findById.mockResolvedValue({
      _id: 'meeting123',
      organization: 'orgXYZ' // Different organization
    });

    await getRsvpSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Meeting not found.' });
    // Crucially ensure the service is NEVER called to prevent PII leakage
    expect(meetingRsvpService.getSummary).not.toHaveBeenCalled(); 
  });

  it('should return 404 for nonexistent meetings', async () => {
    Meeting.findById.mockResolvedValue(null);

    await getRsvpSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Meeting not found.' });
    expect(meetingRsvpService.getSummary).not.toHaveBeenCalled();
  });

  it('should bypass organization check for admin users', async () => {
    req.user.role = 'admin';
    req.user.organization = 'orgXYZ';
    Meeting.findById.mockResolvedValue({
      _id: 'meeting123',
      organization: 'orgABC'
    });
    meetingRsvpService.getSummary.mockResolvedValue({ total: 1 });

    await getRsvpSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(meetingRsvpService.getSummary).toHaveBeenCalled();
  });
});
