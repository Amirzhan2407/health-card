import * as memberService from "../services/memberService.js";

export async function getMembers(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { status } = req.query;
    const members = await memberService.listMembers(orgId, status);
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
}

export async function inviteMember(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { profileId, role } = req.body;
    const member = await memberService.addMember(orgId, profileId, role);
    return res.status(201).json({
      success: true,
      message: "Сотрудник успешно привязан к организации.",
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeMemberStatus(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { id } = req.params;
    const { status } = req.body;
    const member = await memberService.updateMemberStatus(orgId, id, status);
    return res.status(200).json({
      success: true,
      message: `Статус членства успешно изменен на ${status}.`,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { id } = req.params;
    await memberService.deleteMember(orgId, id);
    return res.status(200).json({
      success: true,
      message: "Сотрудник успешно удален из организации.",
    });
  } catch (error) {
    next(error);
  }
}
