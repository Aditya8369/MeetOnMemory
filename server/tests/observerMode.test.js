import { expect } from "chai";
import sinon from "sinon";
import * as observerController from "../controllers/observerController.js";
import Meeting from "../models/meetingModel.js";

describe("Observer Mode", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should approve a shadow request successfully", async () => {
    const meetingMock = {
      _id: "meeting123",
      host: "host123",
      participants: [{ user: "user456", role: "member" }],
      save: sinon.stub().resolves(true),
    };

    sinon.stub(Meeting, "findById").resolves(meetingMock);

    const req = {
      params: { meetingId: "meeting123", userId: "user789" },
      user: { _id: "host123" },
    };
    const res = {
      json: sinon.spy(),
      status: sinon.stub().returns({ json: sinon.spy() }),
    };

    await observerController.approveShadowRequest(req, res);

    expect(meetingMock.participants).to.have.lengthOf(2);
    expect(meetingMock.participants[1].user).to.equal("user789");
    expect(meetingMock.participants[1].role).to.equal("observer");
    expect(meetingMock.save.calledOnce).to.be.true;
    expect(res.json.calledOnce).to.be.true;
  });

  it("should deny a shadow request if not host", async () => {
    const meetingMock = {
      _id: "meeting123",
      host: "host123",
      participants: [],
    };

    sinon.stub(Meeting, "findById").resolves(meetingMock);

    const req = {
      params: { meetingId: "meeting123", userId: "user789" },
      user: { _id: "not_the_host" },
    };
    const res = {
      json: sinon.spy(),
      status: sinon.stub().returns({ json: sinon.spy() }),
    };

    await observerController.approveShadowRequest(req, res);

    expect(res.status.calledWith(403)).to.be.true;
  });
});
